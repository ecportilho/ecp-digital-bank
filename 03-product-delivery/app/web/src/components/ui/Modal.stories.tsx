import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'

const meta: Meta<typeof Modal> = {
  title: 'UI/Modal',
  component: Modal,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
}

export default meta

type Story = StoryObj<typeof Modal>

function ModalDemo({ title, size }: { title?: string; size?: 'sm' | 'md' | 'lg' }) {
  const [isOpen, setIsOpen] = useState(true)
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Button onClick={() => setIsOpen(true)}>Abrir modal</Button>
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={title} size={size}>
        <p>Conteúdo do modal.</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setIsOpen(false)}>Cancelar</Button>
          <Button onClick={() => setIsOpen(false)}>Confirmar</Button>
        </div>
      </Modal>
    </div>
  )
}

export const Default: Story = {
  render: () => <ModalDemo title="Confirmação" size="md" />,
}

export const Small: Story = {
  render: () => <ModalDemo title="Atenção" size="sm" />,
}

export const WithoutTitle: Story = {
  render: () => <ModalDemo size="md" />,
}
