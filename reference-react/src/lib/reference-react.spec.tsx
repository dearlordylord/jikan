import { render } from '@testing-library/react';

import ReferenceReact from './reference-react';

describe('ReferenceReact', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<ReferenceReact />);
    expect(baseElement).toBeTruthy();
  });
});
