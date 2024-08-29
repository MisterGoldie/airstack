import { Button, Frog } from 'frog'
import { handle } from 'frog/vercel'
import fetch from 'node-fetch'

const AIRSTACK_API_URL = 'https://api.airstack.xyz/gql';
const AIRSTACK_API_KEY = process.env.AIRSTACK_API_KEY;
const BACKGROUND_IMAGE_URL = 'https://amaranth-adequate-condor-278.mypinata.cloud/ipfs/QmVfEoPSGHFGByQoGxUUwPq2qzE4uKXT7CSKVaigPANmjZ';

if (!AIRSTACK_API_KEY) {
  console.error('AIRSTACK_API_KEY is not set. Please set this environment variable.');
  process.exit(1);
}

interface FarcasterUserInfo {
  profileName: string | null;
  profileImage: string | null;
  goldiesBalance: string;
}

async function getFarcasterUserInfo(identity: string): Promise<FarcasterUserInfo> {
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
        variables: { identity }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Airstack API response:', JSON.stringify(data, null, 2));

    const wallet = data.data.Wallet;
    const social = wallet.socials[0] || {};
    const tokenBalance = wallet.tokenBalances[0] || { amount: '0' };

    return {
      profileName: social.profileName || null,
      profileImage: social.profileImage || null,
      goldiesBalance: tokenBalance.amount
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
  const { buttonValue, status } = c;

  if (status === 'response') {
    return c.res({
      image: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundImage: `url(${BACKGROUND_IMAGE_URL})`, backgroundSize: 'cover', padding: '20px' }}>
          <h1 style={{ fontSize: '48px', marginBottom: '20px', color: 'white', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>Checking Farcaster Info...</h1>
          <p style={{ fontSize: '24px', color: 'white', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>Identity: {buttonValue}</p>
        </div>
      ),
      intents: [
        <Button action="/result" value={buttonValue}>Show Results</Button>
      ]
    });
  }

  return c.res({
    image: (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundImage: `url(${BACKGROUND_IMAGE_URL})`, backgroundSize: 'cover', padding: '20px' }}>
        <h1 style={{ fontSize: '48px', marginBottom: '20px', color: 'white', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>Farcaster User Info</h1>
        <p style={{ fontSize: '24px', marginBottom: '20px', color: 'white', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>Enter a Farcaster identity (e.g., ENS name)</p>
      </div>
    ),
    intents: [
      <Button action="/">Check Farcaster Info</Button>
    ]
  });
});

app.frame('/result', async (c) => {
  const identity = c.buttonValue;

  if (!identity) {
    return c.res({
      image: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundImage: `url(${BACKGROUND_IMAGE_URL})`, backgroundSize: 'cover', padding: '20px' }}>
          <h1 style={{ fontSize: '48px', marginBottom: '20px', color: 'white', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>Error</h1>
          <p style={{ fontSize: '24px', color: 'white', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>No identity provided</p>
        </div>
      ),
      intents: [
        <Button action="/">Back</Button>
      ]
    });
  }

  try {
    const userInfo = await getFarcasterUserInfo(identity);

    return c.res({
      image: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundImage: `url(${BACKGROUND_IMAGE_URL})`, backgroundSize: 'cover', padding: '20px' }}>
          <h1 style={{ fontSize: '48px', marginBottom: '20px', color: 'white', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>Farcaster User Info</h1>
          <p style={{ fontSize: '24px', color: 'white', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>Identity: {identity}</p>
          <p style={{ fontSize: '24px', color: 'white', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>Profile Name: {userInfo.profileName || 'N/A'}</p>
          <p style={{ fontSize: '24px', color: 'white', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>$GOLDIES Balance: {userInfo.goldiesBalance}</p>
        </div>
      ),
      intents: [
        <Button action="/">Check Another</Button>
      ]
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return c.res({
      image: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundImage: `url(${BACKGROUND_IMAGE_URL})`, backgroundSize: 'cover', padding: '20px' }}>
          <h1 style={{ fontSize: '48px', marginBottom: '20px', color: 'white', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>Error</h1>
          <p style={{ fontSize: '24px', color: 'white', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>Failed to fetch user info: {errorMessage}</p>
        </div>
      ),
      intents: [
        <Button action="/">Try Again</Button>
      ]
    });
  }
});

export const GET = handle(app);
export const POST = handle(app);