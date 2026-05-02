import { render, screen } from '@testing-library/react';
import App from './App';

jest.mock('firebase/auth', () => ({
  onAuthStateChanged: (_auth, callback) => {
    callback(null);
    return () => {};
  },
}));

jest.mock('./firebase', () => ({
  auth: {},
  loginWithGoogle: jest.fn(),
  logout: jest.fn(),
}));

test('renders login screen when not authenticated', async () => {
  render(<App />);
  expect(await screen.findByText('เข้าสู่ระบบด้วย Google')).toBeInTheDocument();
});
