import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { downloadFile } from '../scripts/utils/github-utils.js';

describe('downloadFile', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('retries transient timeout errors and eventually succeeds', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error('first byte timeout'))
      .mockResolvedValueOnce({
        ok: true,
        text: async () => 'synced-content'
      });
    vi.stubGlobal('fetch', fetchMock);

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'download-file-test-'));
    const destPath = path.join(tempDir, 'nested', 'file.txt');

    await downloadFile('https://example.com/file.txt', destPath);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    await expect(fs.readFile(destPath, 'utf8')).resolves.toBe('synced-content');
  });

  it('does not retry non-transient HTTP errors', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found'
    });
    vi.stubGlobal('fetch', fetchMock);

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'download-file-test-'));
    const destPath = path.join(tempDir, 'missing.txt');

    await expect(downloadFile('https://example.com/missing.txt', destPath))
      .rejects.toThrow('Failed to download https://example.com/missing.txt: Not Found');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
