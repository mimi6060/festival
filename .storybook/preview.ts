import type { Preview } from '@storybook/nextjs-vite';
import '../apps/web/app/globals.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'festival-dark',
      values: [
        {
          name: 'festival-dark',
          value: '#1a1a2e',
        },
        {
          name: 'festival-medium',
          value: '#16213e',
        },
        {
          name: 'white',
          value: '#ffffff',
        },
      ],
    },
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default preview;
