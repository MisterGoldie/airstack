import { Button, Frog } from 'frog'
import { handle } from 'frog/vercel'
import fetch from 'node-fetch'

// Configuration
const AIRSTACK_API_URL = 'https://api.airstack.xyz/gql';
const AIRSTACK_API_KEY = process.env.AIRSTACK_API_KEY || '';
const GOLDIES_TOKEN_ADDRESS = '0x3150E01c36ad3Af80bA16C1836eFCD967E96776e';

// Frog app setup
export const app = new Frog({
  basePath: '/api',
  imageOptions: { width: 1200, height: 630 },
  title: 'Farcaster $GOLDIES Balance Checker',
})

// Function to query Airstack API
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
    const response = await fetch(AIRSTACK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': AIRSTACK_API_KEY
      },
      body: JSON.stringify({ query, variables })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error querying Airstack:', error);
    throw error;
  }
}

// Home frame
app.frame('/', (c) => {
  return c.res({
    image: (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#f0f0f0' }}>
        <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>Farcaster $GOLDIES Balance Checker</h1>
        <p style={{ fontSize: '24px', marginBottom: '20px' }}>Click to check your $GOLDIES balance</p>
      </div>
    ),
    intents: [
      <Button action="/check">Check Balance</Button>
    ]
  })
})

// Check balance frame
app.frame('/check', async (c) => {
  const { fid } = c.frameData || {};

  if (!fid) {
    return c.res({
      image: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#f0f0f0' }}>
          <h1 style={{ fontSize: '36px', marginBottom: '20px', color: 'red' }}>Error</h1>
          <p style={{ fontSize: '24px', textAlign: 'center' }}>Unable to retrieve your Farcaster ID. Please ensure you have a valid Farcaster profile.</p>
        </div>
      ),
      intents: [
        <Button action="/">Back</Button>
      ]
    });
  }

  try {
    const data = await queryAirstack(fid.toString());
    const profile = data.Wallet.socials[0];
    const balance = data.Wallet.tokenBalances[0];

    return c.res({
      image: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#f0f0f0' }}>
          <h1 style={{ fontSize: '36px', marginBottom: '20px' }}>$GOLDIES Balance</h1>
          <p style={{ fontSize: '24px', marginBottom: '10px' }}>Profile: {profile.profileName}</p>
          <p style={{ fontSize: '24px', marginBottom: '20px' }}>Balance: {balance ? balance.formattedAmount : '0'} $GOLDIES</p>
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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#f0f0f0' }}>
          <h1 style={{ fontSize: '36px', marginBottom: '20px', color: 'red' }}>Error</h1>
          <p style={{ fontSize: '24px', textAlign: 'center' }}>Unable to fetch balance. Please try again later.</p>
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