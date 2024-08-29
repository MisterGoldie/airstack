import { Button, Frog } from 'frog'
import { handle } from 'frog/vercel'
import fetch from 'node-fetch'

const AIRSTACK_API_URL = 'https://api.airstack.xyz/gql';
const AIRSTACK_API_KEY = process.env.AIRSTACK_API_KEY;

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
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': AIRSTACK_API_KEY || ''
    };

    const response = await fetch(AIRSTACK_API_URL, {
      method: 'POST',
      headers: headers,
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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#f0f0f0', padding: '20px' }}>
          <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>Checking Farcaster Info...</h1>
          <p style={{ fontSize: '24px' }}>Identity: {buttonValue}</p>
        </div>
      ),
      intents: [
        <Button action="/result" value={buttonValue}>Show Results</Button>
      ]
    });
  }

  return c.res({
    image: (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#f0f0f0', padding: '20px' }}>
        <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>Farcaster User Info</h1>
        <p style={{ fontSize: '24px', marginBottom: '20px' }}>Enter a Farcaster identity (e.g., ENS name)</p>
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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#f0f0f0', padding: '20px' }}>
          <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>Error</h1>
          <p style={{ fontSize: '24px' }}>No identity provided</p>
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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#f0f0f0', padding: '20px' }}>
          <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>Farcaster User Info</h1>
          <p style={{ fontSize: '24px' }}>Identity: {identity}</p>
          <p style={{ fontSize: '24px' }}>Profile Name: {userInfo.profileName || 'N/A'}</p>
          <p style={{ fontSize: '24px' }}>$GOLDIES Balance: {userInfo.goldiesBalance}</p>
        </div>
      ),
      intents: [
        <Button action="/">Check Another</Button>
      ]
    });
  } catch (error) {
    return c.res({
      image: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#f0f0f0', padding: '20px' }}>
          <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>Error</h1>
          <p style={{ fontSize: '24px' }}>Failed to fetch user info: {error instanceof Error ? error.message : 'Unknown error'}</p>
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