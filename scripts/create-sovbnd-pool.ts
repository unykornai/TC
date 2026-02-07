// Standalone SOVBND/XRP AMM Pool Creation
import * as xrpl from 'xrpl';
import * as rippleKP from 'ripple-keypairs';
import { decodeSeed } from 'ripple-address-codec';
import * as crypto from 'crypto';

const ISSUER = 'rpraqLjKmDB9a43F9fURWA2bVaywkyJua3';
const SOVBND = '534F56424E440000000000000000000000000000';
const AMM_SEED = 'shURbrLBu9GtDhN7x6oPKFfDBEoZK';
const AMM_ADDR = 'raCevnYFkqAvkDAoeQ7uttf9okSaWxXFuP';

function deriveKeys(seed: string) {
  const decoded = decodeSeed(seed);
  const raw = decoded.bytes;
  const h = crypto.createHash('sha512').update(Buffer.concat([Buffer.from(raw), Buffer.alloc(4)])).digest().slice(0, 32);
  const kp = rippleKP.deriveKeypair('00' + h.toString('hex'));
  return kp;
}

async function main() {
  const client = new xrpl.Client('wss://xrplcluster.com');
  await client.connect();
  console.log('Connected to XRPL mainnet');

  const keys = deriveKeys(AMM_SEED);

  // Check balances
  const info = await client.request({ command: 'account_info', account: AMM_ADDR, ledger_index: 'validated' });
  const xrpBal = parseFloat(info.result.account_data.Balance) / 1e6;
  console.log(`AMM wallet: ${xrpBal.toFixed(2)} XRP`);

  const lines = await client.request({ command: 'account_lines', account: AMM_ADDR, peer: ISSUER });
  const sovLine = (lines.result as any).lines.find((l: any) => l.currency === SOVBND);
  console.log(`SOVBND balance: ${sovLine?.balance || '0'}`);

  // Check if pool already exists
  try {
    const amm = await client.request({ command: 'amm_info', asset: { currency: 'XRP' }, asset2: { currency: SOVBND, issuer: ISSUER } } as any);
    const d = (amm.result as any).amm;
    const px = typeof d.amount === 'string' ? parseFloat(d.amount) / 1e6 : parseFloat(d.amount.value);
    const pt = typeof d.amount2 === 'string' ? parseFloat(d.amount2) / 1e6 : parseFloat(d.amount2.value);
    console.log(`\n✅ SOVBND Pool ALREADY EXISTS: ${px.toFixed(2)} XRP + ${pt.toFixed(0)} SOVBND`);
    await client.disconnect();
    return;
  } catch {
    console.log('No existing SOVBND pool — creating now...');
  }

  const poolXrp = Math.min(Math.floor(xrpBal - 4), 5);
  const sovbndAmt = Math.min(parseInt(sovLine?.balance || '0'), poolXrp * 50);

  if (poolXrp < 1 || sovbndAmt < 1) {
    console.log('Insufficient funds for pool creation');
    await client.disconnect();
    return;
  }

  console.log(`\nCreating pool: ${poolXrp} XRP + ${sovbndAmt} SOVBND (fee: 2%)`);

  const seq = info.result.account_data.Sequence;
  const ledger = (await client.request({ command: 'ledger_current' })).result as any;
  const lls = ledger.ledger_current_index + 30;
  const feeResp = await client.request({ command: 'fee' });
  const baseFee = (feeResp.result as any).drops?.open_ledger_fee || '12';

  const tx: Record<string, any> = {
    TransactionType: 'AMMCreate',
    Account: AMM_ADDR,
    Amount: (poolXrp * 1_000_000).toString(),
    Amount2: { currency: SOVBND, issuer: ISSUER, value: sovbndAmt.toString() },
    TradingFee: 200,
    Sequence: seq,
    LastLedgerSequence: lls,
    Fee: baseFee,
  };

  const encoded = xrpl.encode(tx as any);
  const txBlob = rippleKP.sign(encoded, keys.privateKey);
  const result = await client.request({ command: 'submit', tx_blob: txBlob });
  console.log(`Result: ${(result.result as any).engine_result} — ${(result.result as any).engine_result_message}`);

  if ((result.result as any).engine_result === 'tesSUCCESS') {
    console.log(`TX Hash: ${(result.result as any).tx_json?.hash}`);
    console.log('Waiting for validation...');
    await new Promise(r => setTimeout(r, 6000));

    try {
      const amm = await client.request({ command: 'amm_info', asset: { currency: 'XRP' }, asset2: { currency: SOVBND, issuer: ISSUER } } as any);
      const d = (amm.result as any).amm;
      const px = typeof d.amount === 'string' ? parseFloat(d.amount) / 1e6 : parseFloat(d.amount.value);
      const pt = typeof d.amount2 === 'string' ? parseFloat(d.amount2) / 1e6 : parseFloat(d.amount2.value);
      console.log(`\n🎯 SOVBND POOL LIVE: ${px.toFixed(2)} XRP + ${pt.toFixed(0)} SOVBND`);
    } catch {
      console.log('Pool may still be confirming...');
    }
  }

  await client.disconnect();
}

main().catch(e => console.error('FATAL:', e.message));
