import React from 'react';
import { Text } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';
import ErrorScreen, { isOffline, type ErrorKind } from '../src/shell/ErrorScreen';

const texts = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root.findAllByType(Text).map(t => String(t.props.children));

describe('ErrorScreen', () => {
  it.each<[ErrorKind, string, string]>([
    ['offline', 'You are offline', 'Retry'],
    ['load', 'Could not load UGCad', 'Retry'],
    ['server', 'UGCad is having trouble', 'Retry'],
    ['update', 'Update required', 'Update'],
  ])('renders the %s state with logo and action', async (kind, title, action) => {
    let tree!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      tree = ReactTestRenderer.create(<ErrorScreen kind={kind} onAction={() => {}} />);
    });
    expect(texts(tree)).toEqual(expect.arrayContaining([title, action]));
    expect(tree.root.findAllByType('Image' as never).length + tree.root.findAll(n => n.props.resizeMode === 'contain').length).toBeGreaterThan(0);
  });

  it('calls onAction when the button is pressed', async () => {
    const onAction = jest.fn();
    let tree!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      tree = ReactTestRenderer.create(<ErrorScreen kind="offline" onAction={onAction} />);
    });
    await act(async () => {
      tree.root.findByProps({ testID: 'error-action' }).props.onPress();
    });
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});

describe('isOffline', () => {
  afterEach(() => jest.restoreAllMocks());

  it('is true when the site cannot be reached and false when it answers', async () => {
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Network request failed'));
    expect(await isOffline()).toBe(true);
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, status: 503 } as Response);
    expect(await isOffline()).toBe(false);
  });
});
