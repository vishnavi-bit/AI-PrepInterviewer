/** @jest-environment jsdom */
import { act } from 'react-dom/test-utils';

jest.setTimeout(60000);   // the entry point loads the whole app; allow for a slow first import under load

describe('entry point contract', () => {
  it('mounts the app into #root when it is imported, and mount() can target another element', async () => {
    document.body.innerHTML = '<div id="root"></div><div id="other"></div>';
    await act(async () => { await import('../../../../src/main'); });
    expect(document.getElementById('root')!.textContent).toMatch(/Turn Your Resume into Interview Confidence/);          // the landing page is registered at /
    const { mount } = await import('../../../../src/main');
    await act(async () => { mount(document.getElementById('other')); });
    expect(document.getElementById('other')!.textContent).toMatch(/Turn Your Resume into Interview Confidence/);
  });

  it('mount() does nothing without an element', async () => {
    const { mount } = await import('../../../../src/main');
    expect(mount(null)).toBeNull();
  });
});
