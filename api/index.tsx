import { Button, Frog } from 'frog'
import { handle } from 'frog/vercel'
import fetch from 'node-fetch'

const AIRSTACK_API_URL = 'https://api.airstack.xyz/gql';
const AIRSTACK_API_KEY = process.env.AIRSTACK_API_KEY;
const STATIC_IMAGE_URL = 'https://amaranth-adequate-condor-278.mypinata.cloud/ipfs/QmVfEoPSGHFGByQoGxUUwPq2qzE4uKXT7CSKVaigPANmjZ';

if (!AIRSTACK_API_KEY) {
  console.error('AIRSTACK_API_KEY is not set. Please set this environment variable.');
  process.exit(1);
}

interface FarcasterUserInfo {
  profileName: string | null;
  profileImage: string | null;
  goldiesBalance: string;
}

async function getFarcasterUserInfo(fid: string): Promise<FarcasterUserInfo> {
  const query = `
    query WalletChecker($identity: Identity!) {
      Wallet(input: {identity: $identity, blockchain: ethereum}) {
        socials(input: {filter: {dappName: {_eq: farcaster}}}) {
          dappName
          profileName
          profileImage
        }
        tokenBalances(
          input: {filter: {tokenAddress: {_eq: "0x3150E01c36ad3Af80bA16C1836eFCD967E96776e"}}}
        ) {
          tokenAddress
          amount
          formattedAmount
        }
      }
    }
  `;

  try {
    const response = await fetch(AIRSTACK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': AIRSTACK_API_KEY || ''
      } as Record<string, string>,
      body: JSON.stringify({
        query,
        variables: { identity: fid }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Airstack API response:', JSON.stringify(data, null, 2));

    const wallet = data.data.Wallet;
    const social = wallet.socials[0] || {};
    const tokenBalance = wallet.tokenBalances[0] || { formattedAmount: '0' };

    return {
      profileName: social.profileName || null,
      profileImage: social.profileImage || null,
      goldiesBalance: tokenBalance.formattedAmount
    };
  } catch (error) {
    console.error('Error fetching Farcaster user info:', error);
    throw error;
  }
}

export const app = new Frog({
  basePath: '/api',
  imageOptions: { width: 1200, height: 630 },
  title: 'Farcaster User Info'
})

app.frame('/', (c) => {
  return c.res({
    image: STATIC_IMAGE_URL,
    intents: [
      <Button action="/check">Check Info</Button>
    ]
  });
});

app.frame('/check', async (c) => {
  const { fid } = c.frameData || {};

  if (!fid) {
    return c.res({
      image: STATIC_IMAGE_URL,
      intents: [
        <Button action="/">No FID Found - Go Back</Button>
      ]
    });
  }

  try {
    const userInfo = await getFarcasterUserInfo(fid.toString());

    const balanceText = userInfo.goldiesBalance !== '0' 
      ? `Balance: ${userInfo.goldiesBalance} $GOLDIES` 
      : 'No $GOLDIES balance';

    return c.res({
      image: STATIC_IMAGE_URL,
      intents: [
        <Button action="/">Back</Button>,
        <Button action="/check">{userInfo.profileName || 'User'}: {balanceText}</Button>
      ]
    });
  } catch (error) {
    console.error('Error in balance check:', error);
    return c.res({
      image: STATIC_IMAGE_URL,
      intents: [
        <Button action="/">Back</Button>,
        <Button action="/check">Error: {(error as Error).message}</Button>
      ]
    });
  }
});

export const GET = handle(app);
export const POST = handle(app);