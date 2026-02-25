// CreateFundForm.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';

function CreateFundFormUI({
  isPending, isConfirming, isSuccess, error, onSubmit
}: {
  isPending: boolean;
  isConfirming: boolean;
  isSuccess: boolean;
  error: string | null;
  onSubmit: () => void;
}) {
  return (
    <div>
      <button onClick={onSubmit} disabled={isPending || isConfirming}>
        {isPending    ? 'Confirmá en wallet...' :
         isConfirming ? 'Minando...'            :
                        'Crear fondo'}
      </button>
      {isSuccess && <p>✅ Fondo creado!</p>}
      {error     && <p>❌ {error}</p>}
    </div>
  );
}

const meta: Meta<typeof CreateFundFormUI> = { component: CreateFundFormUI };
export default meta;

export const Default:     StoryObj = { args: { isPending: false, isConfirming: false, isSuccess: false, error: null, onSubmit: fn() } };
export const Pending:     StoryObj = { args: { isPending: true,  isConfirming: false, isSuccess: false, error: null, onSubmit: fn() } };
export const Confirming:  StoryObj = { args: { isPending: false, isConfirming: true,  isSuccess: false, error: null, onSubmit: fn() } };
export const Success:     StoryObj = { args: { isPending: false, isConfirming: false, isSuccess: true,  error: null, onSubmit: fn() } };
export const WithError:   StoryObj = { args: { isPending: false, isConfirming: false, isSuccess: false, error: 'User rejected transaction', onSubmit: fn() } };