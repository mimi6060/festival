import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableFooter,
  TableEmpty,
} from '../apps/web/components/ui/Table';
import { Badge } from '../apps/web/components/ui/Badge';

/**
 * Table component for displaying structured data in rows and columns.
 * Supports sorting, selection, and various styling options.
 */
const meta: Meta<typeof Table> = {
  title: 'UI/Table',
  component: Table,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Size of the table text',
      table: {
        type: { summary: 'TableSize' },
        defaultValue: { summary: 'md' },
      },
    },
    variant: {
      control: 'select',
      options: ['default', 'striped', 'bordered'],
      description: 'Visual style variant',
      table: {
        type: { summary: 'TableVariant' },
        defaultValue: { summary: 'default' },
      },
    },
    hoverable: {
      control: 'boolean',
      description: 'Whether rows are hoverable',
      table: {
        defaultValue: { summary: 'true' },
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Table>;

// Sample data
const users = [
  { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin', status: 'Active' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'User', status: 'Active' },
  { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'User', status: 'Inactive' },
  { id: 4, name: 'Alice Brown', email: 'alice@example.com', role: 'Editor', status: 'Active' },
  { id: 5, name: 'Charlie Wilson', email: 'charlie@example.com', role: 'User', status: 'Pending' },
];

/**
 * Default table with basic data
 */
export const Default: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell>{user.name}</TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell>{user.role}</TableCell>
            <TableCell>
              <Badge
                variant={
                  user.status === 'Active' ? 'success' :
                  user.status === 'Inactive' ? 'error' : 'warning'
                }
              >
                {user.status}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
};

/**
 * Small size table
 */
export const SmallSize: Story = {
  render: () => (
    <Table size="sm">
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.slice(0, 3).map((user) => (
          <TableRow key={user.id}>
            <TableCell>{user.name}</TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell>{user.status}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
};

/**
 * Large size table
 */
export const LargeSize: Story = {
  render: () => (
    <Table size="lg">
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.slice(0, 3).map((user) => (
          <TableRow key={user.id}>
            <TableCell>{user.name}</TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell>{user.status}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
};

/**
 * Table with sortable columns
 */
const SortableDemo = () => {
  const [sortColumn, setSortColumn] = useState<string | null>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortedUsers = [...users].sort((a, b) => {
    if (!sortColumn) return 0;
    const aVal = a[sortColumn as keyof typeof a];
    const bVal = b[sortColumn as keyof typeof b];
    const comparison = String(aVal).localeCompare(String(bVal));
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead
            sortable
            sorted={sortColumn === 'name' ? sortDirection : null}
            onSort={() => handleSort('name')}
          >
            Name
          </TableHead>
          <TableHead
            sortable
            sorted={sortColumn === 'email' ? sortDirection : null}
            onSort={() => handleSort('email')}
          >
            Email
          </TableHead>
          <TableHead
            sortable
            sorted={sortColumn === 'role' ? sortDirection : null}
            onSort={() => handleSort('role')}
          >
            Role
          </TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedUsers.map((user) => (
          <TableRow key={user.id}>
            <TableCell>{user.name}</TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell>{user.role}</TableCell>
            <TableCell>
              <Badge
                variant={user.status === 'Active' ? 'success' : user.status === 'Inactive' ? 'error' : 'warning'}
              >
                {user.status}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export const Sortable: Story = {
  render: () => <SortableDemo />,
};

/**
 * Table with selectable rows
 */
const SelectableDemo = () => {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    setSelectedIds((prev) =>
      prev.length === users.length ? [] : users.map((u) => u.id)
    );
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">
            <input
              type="checkbox"
              checked={selectedIds.length === users.length}
              onChange={toggleAll}
              className="rounded border-white/20"
            />
          </TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow
            key={user.id}
            selected={selectedIds.includes(user.id)}
            onClick={() => toggleSelect(user.id)}
          >
            <TableCell>
              <input
                type="checkbox"
                checked={selectedIds.includes(user.id)}
                onChange={() => toggleSelect(user.id)}
                className="rounded border-white/20"
              />
            </TableCell>
            <TableCell>{user.name}</TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell>
              <Badge variant={user.status === 'Active' ? 'success' : 'error'}>
                {user.status}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export const Selectable: Story = {
  render: () => <SelectableDemo />,
};

/**
 * Table with footer
 */
export const WithFooter: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Product</TableHead>
          <TableHead align="right">Quantity</TableHead>
          <TableHead align="right">Price</TableHead>
          <TableHead align="right">Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>VIP Pass</TableCell>
          <TableCell align="right">2</TableCell>
          <TableCell align="right">$149.00</TableCell>
          <TableCell align="right">$298.00</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>General Admission</TableCell>
          <TableCell align="right">5</TableCell>
          <TableCell align="right">$79.00</TableCell>
          <TableCell align="right">$395.00</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Parking Pass</TableCell>
          <TableCell align="right">1</TableCell>
          <TableCell align="right">$25.00</TableCell>
          <TableCell align="right">$25.00</TableCell>
        </TableRow>
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={3} className="font-semibold text-white">
            Total
          </TableCell>
          <TableCell align="right" className="font-semibold text-white">
            $718.00
          </TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  ),
};

/**
 * Empty state table
 */
export const EmptyState: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableEmpty
          message="No users found"
          description="Try adjusting your search or filters"
          icon={
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
          action={
            <button className="px-4 py-2 bg-primary-500 text-white rounded-lg text-sm">
              Add User
            </button>
          }
        />
      </TableBody>
    </Table>
  ),
};

/**
 * Table with clickable rows
 */
export const ClickableRows: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow
            key={user.id}
            onClick={() => alert(`Clicked: ${user.name}`)}
          >
            <TableCell>{user.name}</TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell>{user.role}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
};

/**
 * Festival-specific: Ticket orders table
 */
export const FestivalTicketOrders: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Order ID</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Ticket Type</TableHead>
          <TableHead align="center">Qty</TableHead>
          <TableHead align="right">Amount</TableHead>
          <TableHead>Status</TableHead>
          <TableHead align="center">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell className="font-mono text-primary-400">#ORD-2025-001</TableCell>
          <TableCell>
            <div>
              <p className="text-white font-medium">John Doe</p>
              <p className="text-white/50 text-sm">john@example.com</p>
            </div>
          </TableCell>
          <TableCell>VIP Pass</TableCell>
          <TableCell align="center">2</TableCell>
          <TableCell align="right" className="font-semibold">$298.00</TableCell>
          <TableCell>
            <Badge variant="success" dot>Confirmed</Badge>
          </TableCell>
          <TableCell align="center">
            <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <svg className="w-4 h-4 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell className="font-mono text-primary-400">#ORD-2025-002</TableCell>
          <TableCell>
            <div>
              <p className="text-white font-medium">Jane Smith</p>
              <p className="text-white/50 text-sm">jane@example.com</p>
            </div>
          </TableCell>
          <TableCell>General Admission</TableCell>
          <TableCell align="center">4</TableCell>
          <TableCell align="right" className="font-semibold">$316.00</TableCell>
          <TableCell>
            <Badge variant="warning" dot>Pending</Badge>
          </TableCell>
          <TableCell align="center">
            <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <svg className="w-4 h-4 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell className="font-mono text-primary-400">#ORD-2025-003</TableCell>
          <TableCell>
            <div>
              <p className="text-white font-medium">Bob Johnson</p>
              <p className="text-white/50 text-sm">bob@example.com</p>
            </div>
          </TableCell>
          <TableCell>Weekend Pass</TableCell>
          <TableCell align="center">1</TableCell>
          <TableCell align="right" className="font-semibold">$199.00</TableCell>
          <TableCell>
            <Badge variant="error">Cancelled</Badge>
          </TableCell>
          <TableCell align="center">
            <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <svg className="w-4 h-4 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
          </TableCell>
        </TableRow>
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={4}>Total (3 orders)</TableCell>
          <TableCell align="right" className="font-semibold text-white">$813.00</TableCell>
          <TableCell colSpan={2}></TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  ),
};

/**
 * Festival-specific: Staff schedule table
 */
export const FestivalStaffSchedule: Story = {
  render: () => (
    <Table size="sm">
      <TableHeader>
        <TableRow>
          <TableHead>Staff Member</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Zone</TableHead>
          <TableHead>Shift</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white text-xs font-semibold">
                MK
              </div>
              <span>Mike K.</span>
            </div>
          </TableCell>
          <TableCell>Security</TableCell>
          <TableCell>Main Stage</TableCell>
          <TableCell>14:00 - 22:00</TableCell>
          <TableCell><Badge variant="success" size="sm">On Duty</Badge></TableCell>
        </TableRow>
        <TableRow>
          <TableCell>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-pink-500 flex items-center justify-center text-white text-xs font-semibold">
                SL
              </div>
              <span>Sarah L.</span>
            </div>
          </TableCell>
          <TableCell>Ticketing</TableCell>
          <TableCell>Entrance A</TableCell>
          <TableCell>10:00 - 18:00</TableCell>
          <TableCell><Badge variant="success" size="sm">On Duty</Badge></TableCell>
        </TableRow>
        <TableRow>
          <TableCell>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-semibold">
                TN
              </div>
              <span>Tom N.</span>
            </div>
          </TableCell>
          <TableCell>Cashier</TableCell>
          <TableCell>Food Court</TableCell>
          <TableCell>16:00 - 00:00</TableCell>
          <TableCell><Badge variant="warning" size="sm">Break</Badge></TableCell>
        </TableRow>
        <TableRow>
          <TableCell>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-semibold">
                AR
              </div>
              <span>Amy R.</span>
            </div>
          </TableCell>
          <TableCell>Medical</TableCell>
          <TableCell>First Aid</TableCell>
          <TableCell>18:00 - 02:00</TableCell>
          <TableCell><Badge variant="default" size="sm">Upcoming</Badge></TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
};
