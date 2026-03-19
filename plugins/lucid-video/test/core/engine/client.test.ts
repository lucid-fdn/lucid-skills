import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EngineClient } from '../../../src/core/engine/client.js';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('EngineClient', () => {
  let client: EngineClient;

  beforeEach(() => {
    mockFetch.mockReset();
    client = new EngineClient({ engineUrl: 'http://localhost:4030' });
  });

  it('render() posts brief and returns render response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ render_id: 'r_123', estimated_seconds: 120, status: 'queued' }),
    });

    const result = await client.render({
      template_id: 'social-clip-v1',
      scenes: [{ type: 'title', duration: 3, props: { text: 'Hi' } }],
      output: { format: 'mp4', resolution: '1080p' },
    });

    expect(result.render_id).toBe('r_123');
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:4030/render',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('getStatus() returns render status', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ status: 'rendering', progress_pct: 45 }),
    });

    const result = await client.getStatus('r_123');
    expect(result.status).toBe('rendering');
    expect(result.progress_pct).toBe(45);
  });

  it('listTemplates() returns template list', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([{ id: 'social-clip-v1', name: 'Social Clip' }]),
    });

    const result = await client.listTemplates();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('social-clip-v1');
  });

  it('listTemplates() with category adds query param', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    await client.listTemplates('marketing');
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:4030/templates?category=marketing',
      expect.anything(),
    );
  });

  it('thumbnail() returns thumbnail URL', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ thumbnail_url: 'https://cdn.example.com/thumb.png' }),
    });

    const result = await client.thumbnail({
      template_id: 'test',
      scenes: [{ type: 'title', duration: 3, props: {} }],
      output: { format: 'mp4', resolution: '1080p' },
    });
    expect(result.thumbnail_url).toBe('https://cdn.example.com/thumb.png');
  });

  it('cancel() returns cancellation status', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ cancelled: true }),
    });

    const result = await client.cancel('r_123');
    expect(result.cancelled).toBe(true);
  });

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Internal Server Error'),
    });

    await expect(client.render({
      template_id: 'test',
      scenes: [{ type: 'title', duration: 3, props: {} }],
      output: { format: 'mp4', resolution: '1080p' },
    })).rejects.toThrow('Engine API error 500');
  });

  it('strips trailing slash from engine URL', () => {
    const c = new EngineClient({ engineUrl: 'http://localhost:4030/' });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });
    c.listTemplates();
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:4030/templates',
      expect.anything(),
    );
  });
});
