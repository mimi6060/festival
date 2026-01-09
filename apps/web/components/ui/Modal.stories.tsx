import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Modal, ConfirmModal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';

const meta: Meta<typeof Modal> = {
  title: 'UI/Modal',
  component: Modal,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl', 'full'],
      description: 'Size of the modal',
    },
    showCloseButton: {
      control: 'boolean',
      description: 'Shows close button',
    },
    closeOnOverlayClick: {
      control: 'boolean',
      description: 'Close when clicking overlay',
    },
    closeOnEsc: {
      control: 'boolean',
      description: 'Close on Escape key',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Modal>;

// Interactive Modal
const ModalDemo = () => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Open Modal</Button>
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Modal Title"
        description="This is a description of the modal content."
      >
        <p className="text-white/70">This is the modal content. You can put any content here.</p>
      </Modal>
    </>
  );
};

export const Default: Story = {
  render: () => <ModalDemo />,
};

// Different Sizes
const SizeDemo = ({ size }: { size: 'sm' | 'md' | 'lg' | 'xl' | 'full' }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Open {size.toUpperCase()} Modal</Button>
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={`${size.toUpperCase()} Modal`}
        size={size}
      >
        <p className="text-white/70">
          This is a {size} sized modal. The width adjusts based on the size prop.
        </p>
      </Modal>
    </>
  );
};

export const SmallSize: Story = {
  render: () => <SizeDemo size="sm" />,
};

export const MediumSize: Story = {
  render: () => <SizeDemo size="md" />,
};

export const LargeSize: Story = {
  render: () => <SizeDemo size="lg" />,
};

export const ExtraLargeSize: Story = {
  render: () => <SizeDemo size="xl" />,
};

export const FullSize: Story = {
  render: () => <SizeDemo size="full" />,
};

// Form Modal
const FormModalDemo = () => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Open Form Modal</Button>
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Create Account"
        description="Fill in your details to create a new account."
        size="md"
      >
        <div className="flex flex-col gap-4">
          <Input label="Full Name" placeholder="John Doe" />
          <Input label="Email" type="email" placeholder="john@example.com" />
          <Input label="Password" type="password" placeholder="Create a password" />
          <div className="flex gap-3 mt-4">
            <Button variant="secondary" fullWidth onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" fullWidth>
              Create Account
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export const FormModal: Story = {
  render: () => <FormModalDemo />,
};

// Without Close Button
const NoCloseButtonDemo = () => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Open Modal (No Close Button)</Button>
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Important Notice"
        showCloseButton={false}
      >
        <p className="text-white/70 mb-4">
          This modal has no close button. Click outside or press Escape to close.
        </p>
        <Button fullWidth onClick={() => setIsOpen(false)}>
          Got it
        </Button>
      </Modal>
    </>
  );
};

export const NoCloseButton: Story = {
  render: () => <NoCloseButtonDemo />,
};

// Confirm Modal - Danger
const ConfirmDangerDemo = () => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Button variant="danger" onClick={() => setIsOpen(true)}>
        Delete Item
      </Button>
      <ConfirmModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onConfirm={() => {
          alert('Deleted!');
          setIsOpen(false);
        }}
        title="Delete Item"
        message="Are you sure you want to delete this item? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </>
  );
};

export const ConfirmDanger: Story = {
  render: () => <ConfirmDangerDemo />,
};

// Confirm Modal - Warning
const ConfirmWarningDemo = () => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Cancel Order</Button>
      <ConfirmModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onConfirm={() => {
          alert('Order cancelled!');
          setIsOpen(false);
        }}
        title="Cancel Order"
        message="Are you sure you want to cancel this order? You will receive a full refund."
        confirmText="Yes, Cancel"
        cancelText="No, Keep Order"
        variant="warning"
      />
    </>
  );
};

export const ConfirmWarning: Story = {
  render: () => <ConfirmWarningDemo />,
};

// Confirm Modal - Info
const ConfirmInfoDemo = () => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Transfer Ticket</Button>
      <ConfirmModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onConfirm={() => {
          alert('Ticket transferred!');
          setIsOpen(false);
        }}
        title="Transfer Ticket"
        message="You are about to transfer this ticket to another user. They will receive an email notification."
        confirmText="Transfer"
        cancelText="Cancel"
        variant="info"
      />
    </>
  );
};

export const ConfirmInfo: Story = {
  render: () => <ConfirmInfoDemo />,
};

// Loading State
const ConfirmLoadingDemo = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setIsOpen(false);
    }, 2000);
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Process Payment</Button>
      <ConfirmModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onConfirm={handleConfirm}
        title="Confirm Payment"
        message="You are about to process a payment of 149. Continue?"
        confirmText="Pay Now"
        cancelText="Cancel"
        variant="info"
        isLoading={isLoading}
      />
    </>
  );
};

export const ConfirmLoading: Story = {
  render: () => <ConfirmLoadingDemo />,
};
