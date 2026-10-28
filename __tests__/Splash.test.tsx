import React from 'react';
import { Platform, Text } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';
import Splash from '../src/shell/Splash';

const render = async (visible: boolean) => {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    tree = ReactTestRenderer.create(<Splash visible={visible} />);
  });
  return tree;
};

const texts = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root.findAllByType(Text).map(t => String(t.props.children));

afterEach(() => jest.restoreAllMocks());

describe('Splash', () => {
  it('iOS: draws the design loader (linked clips, wordmark, caption) while visible', async () => {
    const tree = await render(true);
    expect(tree.root.findByProps({ testID: 'splash' })).toBeTruthy();
    expect(texts(tree)).toContain('Getting your dashboard ready…');
    tree.unmount();
  });

  it('iOS: draws nothing once the site is ready', async () => {
    expect((await render(false)).toJSON()).toBeNull();
  });

  it('Android: keeps the original logo-only splash', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    const tree = await render(true);
    expect(tree.root.findByProps({ testID: 'splash' })).toBeTruthy();
    expect(texts(tree)).toEqual([]);
  });
});
