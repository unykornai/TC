import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

describe('Platform Configuration', () => {
  const configPath = path.join(__dirname, '..', '..', '..', '..', 'config', 'platform-config.yaml');
  let config: any;

  beforeAll(() => {
    const raw = fs.readFileSync(configPath, 'utf-8');
    config = yaml.parse(raw);
  });

  it('should load platform config', () => {
    expect(config).toBeDefined();
    expect(config.platform).toBeDefined();
  });

  it('should have platform metadata', () => {
    expect(config.platform.name).toContain('OPTKAS');
    expect(config.platform.version).toBeDefined();
  });

  it('should have governance configuration', () => {
    expect(config.governance).toBeDefined();
    expect(config.governance.multisig).toBeDefined();
    expect(config.governance.multisig.threshold).toBe(2);
    expect(config.governance.multisig.roles).toHaveLength(3);
  });

  it('should have XRPL network configuration', () => {
    expect(config.networks.xrpl).toBeDefined();
    expect(config.networks.xrpl.active).toBe('testnet');
    expect(config.networks.xrpl.testnet.url).toBeDefined();
  });

  it('should have Stellar network configuration', () => {
    expect(config.networks.stellar).toBeDefined();
    expect(config.networks.stellar.active).toBe('testnet');
  });

  it('should have XRPL accounts defined', () => {
    expect(config.xrpl_accounts).toBeDefined();
    expect(config.xrpl_accounts.issuer).toBeDefined();
    expect(config.xrpl_accounts.treasury).toBeDefined();
  });

  it('should have tokens defined', () => {
    expect(config.tokens).toBeDefined();
    expect(config.tokens.length).toBeGreaterThan(0);
  });

  it('should have escrow templates', () => {
    expect(config.escrow_templates).toBeDefined();
    expect(config.escrow_templates.bond_funding).toBeDefined();
  });

  it('should have audit configuration', () => {
    expect(config.audit).toBeDefined();
    expect(config.audit.retention_days).toBeGreaterThanOrEqual(2555);
  });

  it('should default to safe/testnet', () => {
    expect(config.networks.xrpl.active).toBe('testnet');
    expect(config.networks.stellar.active).toBe('testnet');
  });

  it('should have compliance configuration', () => {
    expect(config.compliance).toBeDefined();
  });
});
