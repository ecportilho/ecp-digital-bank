import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react'

interface TableProps extends HTMLAttributes<HTMLTableElement> {}
export function Table({ className = '', children, ...props }: TableProps) {
  return (
    <div className="w-full overflow-x-auto">
      <table
        className={`w-full text-sm text-text-secondary ${className}`}
        {...props}
      >
        {children}
      </table>
    </div>
  )
}

interface TableHeaderProps extends HTMLAttributes<HTMLTableSectionElement> {}
export function TableHeader({ className = '', children, ...props }: TableHeaderProps) {
  return (
    <thead className={`border-b border-border ${className}`} {...props}>
      {children}
    </thead>
  )
}

interface TableBodyProps extends HTMLAttributes<HTMLTableSectionElement> {}
export function TableBody({ className = '', children, ...props }: TableBodyProps) {
  return (
    <tbody className={`divide-y divide-border/50 ${className}`} {...props}>
      {children}
    </tbody>
  )
}

interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {}
export function TableRow({ className = '', children, ...props }: TableRowProps) {
  return (
    <tr
      className={`hover:bg-secondary-bg/50 transition-colors ${className}`}
      {...props}
    >
      {children}
    </tr>
  )
}

interface TableHeadProps extends ThHTMLAttributes<HTMLTableCellElement> {}
export function TableHead({ className = '', children, ...props }: TableHeadProps) {
  return (
    <th
      className={`px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider ${className}`}
      {...props}
    >
      {children}
    </th>
  )
}

interface TableCellProps extends TdHTMLAttributes<HTMLTableCellElement> {}
export function TableCell({ className = '', children, ...props }: TableCellProps) {
  return (
    <td className={`px-4 py-3 text-text-secondary ${className}`} {...props}>
      {children}
    </td>
  )
}
