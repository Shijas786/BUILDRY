/**
 * One-time script to generate + register a Farcaster signer for Buildry.
 *
 * Requirements:
 *   APP_FID      - your Buildry Farcaster account FID (e.g. 259913)
 *   APP_MNEMONIC - 12/24 word recovery phrase of the wallet that holds your FID
 *
 * Usage:
 *   APP_FID=259913 APP_MNEMONIC="word1 ... wordN" node scripts/setup-farcaster-signer.mjs
 *
 * On success prints:
 *   FARCASTER_SIGNER_PRIVATE_KEY=0x...
 *
 * Add that to your .env and Vercel environment variables.
 */

import { ed25519 } from '@noble/curves/ed25519'
import { mnemonicToAccount } from 'viem/accounts'
import axios from 'axios'
import qrcode from 'qrcode-terminal'

const SIGNED_KEY_REQUEST_VALIDATOR_EIP_712_DOMAIN = {
  name: 'Farcaster SignedKeyRequestValidator',
  version: '1',
  chainId: 10,
  verifyingContract: '0x00000000fc700472606ed4fa22623acf62c60553',
}

const SIGNED_KEY_REQUEST_TYPE = [
  { name: 'requestFid', type: 'uint256' },
  { name: 'key', type: 'bytes' },
  { name: 'deadline', type: 'uint256' },
]

const appFid = process.env.APP_FID
const appMnemonic = process.env.APP_MNEMONIC

if (!appFid || !appMnemonic) {
  console.error('\nUsage:')
  console.error('  APP_FID=<your_fid> APP_MNEMONIC="word1 word2 ..." node scripts/setup-farcaster-signer.mjs\n')
  console.error('Find your FID at: warpcast.com/~/settings')
  process.exit(1)
}

console.log('\n🔑 Generating Ed25519 key pair...')
const privateKey = ed25519.utils.randomPrivateKey()
const publicKeyBytes = ed25519.getPublicKey(privateKey)
const publicKeyHex = '0x' + Buffer.from(publicKeyBytes).toString('hex')
const privateKeyHex = '0x' + Buffer.from(privateKey).toString('hex')

console.log('✅ Key pair generated')
console.log('📝 Signing key request with app FID', appFid, '...')

const account = mnemonicToAccount(appMnemonic)
const deadline = Math.floor(Date.now() / 1000) + 86400 // 24h

const signature = await account.signTypedData({
  domain: SIGNED_KEY_REQUEST_VALIDATOR_EIP_712_DOMAIN,
  types: { SignedKeyRequest: SIGNED_KEY_REQUEST_TYPE },
  primaryType: 'SignedKeyRequest',
  message: {
    requestFid: BigInt(appFid),
    key: publicKeyHex,
    deadline: BigInt(deadline),
  },
})

console.log('✅ Signed')
console.log('📡 Submitting to Farcaster API...')

const { token, deeplinkUrl } = await axios
  .post('https://api.farcaster.xyz/v2/signed-key-requests', {
    key: publicKeyHex,
    requestFid: Number(appFid),
    signature,
    deadline,
  })
  .then((r) => r.data.result.signedKeyRequest)

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('📱 Scan this QR code in Warpcast to approve:')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
qrcode.generate(deeplinkUrl, { small: true }, console.log)
console.log('\n🔗 Or open this deeplink on your phone:')
console.log(deeplinkUrl)
console.log('\n⏳ Waiting for you to approve in Warpcast...\n')

while (true) {
  await new Promise((r) => setTimeout(r, 2000))
  process.stdout.write('.')

  const result = await axios
    .get('https://api.farcaster.xyz/v2/signed-key-request', { params: { token } })
    .then((r) => r.data.result.signedKeyRequest)

  if (result.state === 'completed') {
    console.log('\n\n✅ Signer approved and confirmed onchain!\n')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('Add this to your .env and Vercel environment variables:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    console.log(`FARCASTER_SIGNER_PRIVATE_KEY=${privateKeyHex}`)
    console.log(`\nYour FID confirmed: ${result.userFid}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    break
  }
}
