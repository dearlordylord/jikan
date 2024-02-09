import React from 'react';
import { render } from '@testing-library/react-native';

import ReactNativeTimer from './timer';

describe('Timer', () => {
  it('should render successfully', () => {
    const { root } = render(<ReactNativeTimer />);
    expect(root).toBeTruthy();
  });
});
