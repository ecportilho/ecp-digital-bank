import type { Meta, StoryObj } from '@storybook/react'
import { Card, CardHeader, CardTitle, CardContent } from './Card'

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  tags: ['autodocs'],
}

export default meta

type Story = StoryObj<typeof Card>

export const Default: Story = {
  args: {
    children: (
      <>
        <CardHeader>
          <CardTitle>Saldo em conta</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">R$ 1.234,56</p>
        </CardContent>
      </>
    ),
  },
}

export const Highlighted: Story = {
  args: {
    variant: 'highlighted',
    children: (
      <>
        <CardHeader>
          <CardTitle>Em destaque</CardTitle>
        </CardHeader>
        <CardContent>Borda lime suave.</CardContent>
      </>
    ),
  },
}
