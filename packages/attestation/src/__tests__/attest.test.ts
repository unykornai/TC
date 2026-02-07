import { AttestationEngine } from '../attest';

describe('AttestationEngine', () => {
  it('should hash data consistently', () => {
    const hash1 = AttestationEngine.hashData('test data');
    const hash2 = AttestationEngine.hashData('test data');
    expect(hash1).toBe(hash2);
  });

  it('should produce valid SHA-256 hashes', () => {
    const hash = AttestationEngine.hashData('OPTKAS');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('should produce different hashes for different data', () => {
    const hash1 = AttestationEngine.hashData('data1');
    const hash2 = AttestationEngine.hashData('data2');
    expect(hash1).not.toBe(hash2);
  });

  it('should hash empty string', () => {
    const hash = AttestationEngine.hashData('');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});
