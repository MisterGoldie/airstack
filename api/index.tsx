import { Button, Frog } from 'frog'
import { handle } from 'frog/vercel'
import fetch from 'node-fetch'

const AIRSTACK_API_URL = 'https://api.airstack.xyz/gql';
const AIRSTACK_API_KEY = process.env.AIRSTACK_API_KEY;
const GOLDIES_TOKEN_ADDRESS = '0x3150E01c36ad3Af80bA16C1836eFCD967E96776e';
const STATIC_IMAGE_URL = 'https://amaranth-adequate-condor-278.mypinata.cloud/ipfs/QmVfEoPSGHFGByQoGxUUwPq2qzE4uKXT7CSKVaigPANmjZ';

if (!AIRSTACK_API_KEY) {
  console.error('AIRSTACK_API_KEY is not set. Please set this environment variable.');
  process.exit(1);
}

async function queryAirstack(fid: string) {
  const query = `
    query WalletChecker($identity: Identity!, $tokenAddress: Address!) {
      Wallet(input: {identity: $identity, blockchain: ethereum}) {
        socials(input: {filter: {dappName: {_eq: farcaster}}}) {
          dappName
          profileName
          profileImage
        }
        tokenBalances(
          input: {filter: {tokenAddress: {_eq: $tokenAddress}}}
        ) {
          tokenAddress
          amount
          formattedAmount
        }
      }
    }
  `;

  const variables = {
    identity: fid,
    tokenAddress: GOLDIES_TOKEN_ADDRESS
  };

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': AIRSTACK_API_KEY || ''
    };

    const response = await fetch(AIRSTACK_API_URL, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ query, variables })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Airstack API response:', JSON.stringify(data, null, 2));
    return data.data;
  } catch (error) {
    console.error('Error querying Airstack:', error);
    throw error;
  }
}

export const app = new Frog({
  basePath: '/api',
  imageOptions: { width: 1200, height: 630 },
  title: 'Farcaster $GOLDIES Balance Checker'
})

app.frame('/', (c) => {
  return c.res({
    image: (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundImage: `url(${STATIC_IMAGE_URL})`, backgroundSize: 'cover', backgroundPosition: 'center', padding: '20px', boxSizing: 'border-box' }}>
        <h1 style={{ fontSize: '60px', marginBottom: '20px', textAlign: 'center', color: 'white', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>$GOLDIES Balance Checker</h1>
        <p style={{ fontSize: '36px', marginBottom: '20px', textAlign: 'center', color: 'white', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>Click to check your $GOLDIES balance</p>
      </div>
    ),
    intents: [
      <Button action="/check">Check Balance</Button>
    ]
  })
})

app.frame('/check', async (c) => {
  const { fid } = c.frameData || {};

  if (!fid) {
    return c.res({
      image: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#FF8B19', padding: '20px', boxSizing: 'border-box' }}>
          <h1 style={{ fontSize: '48px', marginBottom: '20px', textAlign: 'center' }}>Error</h1>
          <p style={{ fontSize: '36px', textAlign: 'center' }}>Unable to retrieve your Farcaster ID. Please ensure you have a valid Farcaster profile.</p>
        </div>
      ),
      intents: [
        <Button action="/">Back</Button>
      ]
    });
  }

  try {
    const data = await queryAirstack(fid.toString());
    
    if (!data || !data.Wallet || !data.Wallet.socials || data.Wallet.socials.length === 0) {
      throw new Error('No Farcaster profile found');
    }

    const profile = data.Wallet.socials[0];
    const balance = data.Wallet.tokenBalances && data.Wallet.tokenBalances[0] ? data.Wallet.tokenBalances[0].formattedAmount : '0';

    return c.res({
      image: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#FF8B19', padding: '20px', boxSizing: 'border-box' }}>
          <h1 style={{ fontSize: '60px', marginBottom: '20px', textAlign: 'center' }}>Your $GOLDIES Balance</h1>
          <p style={{ fontSize: '32px', textAlign: 'center' }}>FID: {fid}</p>
          <p style={{ fontSize: '42px', textAlign: 'center' }}>{profile.profileName}</p>
          <p style={{ fontSize: '42px', textAlign: 'center' }}>{balance} $GOLDIES</p>
        </div>
      ),
      intents: [
        <Button action="/">Back</Button>,
        <Button action="/check">Refresh</Button>
      ]
    });
  } catch (error) {
    console.error('Error in balance check:', error);
    return c.res({
      image: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#FF8B19', padding: '20px', boxSizing: 'border-box' }}>
          <h1 style={{ fontSize: '48px', marginBottom: '20px', textAlign: 'center' }}>Error</h1>
          <p style={{ fontSize: '36px', textAlign: 'center' }}>Unable to fetch balance or price.</p>
          <p style={{ fontSize: '24px', textAlign: 'center' }}>Error details: {error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      ),
      intents: [
        <Button action="/">Back</Button>,
        <Button action="/check">Retry</Button>
      ]
    });
  }
});

export const GET = handle(app);
export const POST = handle(app);