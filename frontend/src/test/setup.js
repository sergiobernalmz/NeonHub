import { beforeAll, afterEach, expect } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom'

// limpiamos después de cada test
afterEach(() => {
  cleanup()
})

// utilidades globales para los tests
global.testUtils = {
  // datos de usuario de prueba
  mockUser: {
    id: '123e4567-e89b-12d3-a456-426614174000',
    username: 'testuser',
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
    roles: [
      {
        id: 'role-123',
        name: 'admin',
        display_name: 'Administrator',
        level: 80,
        permissions: {
          users: { read: true, create: true, update: true, delete: true },
          products: { read: true, create: true, update: true, delete: true }
        }
      }
    ],
    is_active: true,
    email_verified: true
  },

  // usuario cliente de prueba
  mockCustomer: {
    id: '123e4567-e89b-12d3-a456-426614174001',
    username: 'customer',
    email: 'customer@example.com',
    first_name: 'Customer',
    last_name: 'User',
    roles: [
      {
        id: 'role-customer',
        name: 'customer',
        display_name: 'Customer',
        level: 1,
        permissions: {
          orders: { read: true }
        }
      }
    ],
    is_active: true,
    email_verified: true
  },

  // datos de producto de prueba
  mockProduct: {
    id: 'product-123',
    name: 'Eco-Friendly T-Shirt',
    slug: 'eco-friendly-t-shirt',
    sku: 'ECO-001',
    description: 'Sustainable cotton t-shirt',
    price: '29.99',
    stock_quantity: 100,
    is_active: true,
    carbon_footprint: '2.5',
    eco_score: 85,
    material_info: {
      primary_material: 'organic_cotton',
      recycled_content: 0.3,
      certifications: ['GOTS']
    },
    images: [
      {
        id: 'img-1',
        url: '/uploads/products/eco-shirt-1.jpg',
        alt: 'Eco-friendly t-shirt front view',
        is_primary: true
      }
    ]
  },

  // datos de pedido de prueba
  mockOrder: {
    id: 'order-123',
    order_number: 'ORD-2024-001',
    status: 'pending',
    payment_status: 'pending',
    total_amount: '59.98',
    order_co2: '5.0',
    order_date: '2024-11-09T10:00:00Z',
    customer: {
      id: 'customer-123',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com'
    },
    items: [
      {
        id: 'item-1',
        quantity: 2,
        unit_price: '29.99',
        product: {
          name: 'Eco-Friendly T-Shirt',
          sku: 'ECO-001'
        }
      }
    ]
  },

  // datos de reporte de prueba
  mockReport: {
    id: 'report-123',
    report_number: 'RPT-2024-001',
    type: 'bug',
    title: 'Test Report',
    description: 'Test report description',
    status: 'pending',
    priority: 'medium',
    created_at: '2024-11-09T10:00:00Z',
    assigned_to: null,
    reporter: {
      id: 'user-123',
      username: 'testuser',
      email: 'test@example.com'
    }
  },

  // estadísticas del dashboard de prueba
  mockDashboardStats: {
    stats: {
      totalSales: { value: 15420.50, change: 12.5, trend: 'up' },
      totalOrders: { value: 148, change: 8.2, trend: 'up' },
      totalCustomers: { value: 89, change: 15.3, trend: 'up' },
      totalProducts: { value: 156, change: 3.1, trend: 'up' }
    }
  },

  // métricas de sostenibilidad de prueba
  mockSustainabilityMetrics: {
    carbonFootprint: '125.5 kg',
    energyEfficiency: '85%',
    waterConserved: '1,250 L',
    materialRecycled: '67%'
  }
}

// mock de localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
global.localStorage = localStorageMock

// mock de fetch
global.fetch = vi.fn()

// mock de IntersectionObserver (para componentes que lo usan)
global.IntersectionObserver = vi.fn(() => ({
  observe: vi.fn(),
  disconnect: vi.fn(),
  unobserve: vi.fn(),
}))

// mock de ResizeObserver (para componentes responsive)
global.ResizeObserver = vi.fn(() => ({
  observe: vi.fn(),
  disconnect: vi.fn(),
  unobserve: vi.fn(),
}))

// mock de matchMedia (para diseño responsive)
global.matchMedia = vi.fn((query) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(), // obsoleto
  removeListener: vi.fn(), // obsoleto
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}))

// mock de react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useParams: () => ({}),
    useLocation: () => ({ pathname: '/', search: '', hash: '', state: null }),
  }
})

// mock de framer-motion para evitar problemas con animaciones en los tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    button: ({ children, ...props }) => <button {...props}>{children}</button>,
    form: ({ children, ...props }) => <form {...props}>{children}</form>,
    span: ({ children, ...props }) => <span {...props}>{children}</span>,
    h1: ({ children, ...props }) => <h1 {...props}>{children}</h1>,
    h2: ({ children, ...props }) => <h2 {...props}>{children}</h2>,
    h3: ({ children, ...props }) => <h3 {...props}>{children}</h3>,
    p: ({ children, ...props }) => <p {...props}>{children}</p>,
    ul: ({ children, ...props }) => <ul {...props}>{children}</ul>,
    li: ({ children, ...props }) => <li {...props}>{children}</li>,
  },
  AnimatePresence: ({ children }) => children,
}))

// mock de recharts para los tests del dashboard
vi.mock('recharts', () => ({
  LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  AreaChart: ({ children }) => <div data-testid="area-chart">{children}</div>,
  Area: () => <div data-testid="area" />,
  BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  PieChart: ({ children }) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
  Legend: () => <div data-testid="legend" />,
}))

// mock de los iconos de lucide-react
vi.mock('lucide-react', () => {
  const mockIcon = ({ className, ...props }) => 
    <div className={className} data-testid="lucide-icon" {...props} />
  
  return {
    User: mockIcon,
    Lock: mockIcon,
    Mail: mockIcon,
    Eye: mockIcon,
    EyeOff: mockIcon,
    Leaf: mockIcon,
    Home: mockIcon,
    Package: mockIcon,
    ShoppingCart: mockIcon,
    BarChart3: mockIcon,
    Settings: mockIcon,
    X: mockIcon,
    Users: mockIcon,
    FileText: mockIcon,
    TrendingUp: mockIcon,
    TrendingDown: mockIcon,
    DollarSign: mockIcon,
    Bell: mockIcon,
    Search: mockIcon,
    Plus: mockIcon,
    Edit: mockIcon,
    Trash2: mockIcon,
    Save: mockIcon,
    Cancel: mockIcon,
    ArrowLeft: mockIcon,
    ChevronDown: mockIcon,
    Zap: mockIcon,
    Droplets: mockIcon,
    Recycle: mockIcon,
  }
})