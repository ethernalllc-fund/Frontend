import type { Meta, StoryObj } from '@storybook/react-vite';
import ContractsManagement from '@/pages/admin/ContractsManagement';

const meta: Meta<typeof ContractsManagement> = {
  title:      'Admin/ContractsManagement',
  component:  ContractsManagement,
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof ContractsManagement>;

export const Placeholder: Story = {};