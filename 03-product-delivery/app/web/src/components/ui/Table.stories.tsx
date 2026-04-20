import type { Meta, StoryObj } from '@storybook/react'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './Table'

const meta: Meta<typeof Table> = {
  title: 'UI/Table',
  component: Table,
  tags: ['autodocs'],
}

export default meta

type Story = StoryObj<typeof Table>

export const Default: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Data</TableHead>
          <TableHead>Descrição</TableHead>
          <TableHead>Valor</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>20/04/2026</TableCell>
          <TableCell>Pix enviado</TableCell>
          <TableCell>- R$ 150,00</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>19/04/2026</TableCell>
          <TableCell>Boleto luz</TableCell>
          <TableCell>- R$ 220,30</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>18/04/2026</TableCell>
          <TableCell>Pix recebido</TableCell>
          <TableCell>+ R$ 500,00</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
}
