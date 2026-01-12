export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type PaymentStatus = 'paid' | 'unpaid' | 'partial'
export type PaymentMethod = 'bank' | 'cash'
export type AttributionType = 'contract' | 'punct_lucru' | 'deee'
export type LocationType = 'curte' | 'contract' | 'deee'
export type TransportType = 'intern' | 'extern'
export type SaleStatus = 'pending' | 'reception_done' | 'cancelled'
export type ContractStatus = 'active' | 'completed' | 'cancelled'
export type ExpenseType = 'payment' | 'collection'
export type UserRole = 'super_admin' | 'admin' | 'operator' | 'viewer'
export type CashRegisterType = 'cash' | 'bank'
export type CashTransactionType = 'income' | 'expense'
export type TransactionSourceType = 'manual' | 'acquisition' | 'sale' | 'expense'
export type MaterialCategory = 'feros' | 'neferos' | 'deee' | 'altele'
export type AcquisitionType = 'normal' | 'zero' | 'director'
export type VehicleOwnerType = 'own_fleet' | 'transporter' | 'supplier'

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string
          name: string
          cui: string | null
          reg_com: string | null
          address: string | null
          city: string | null
          county: string | null
          country: string
          phone: string | null
          email: string | null
          iban: string | null
          bank: string | null
          environment_auth: string | null
          logo_url: string | null
          weighing_location: string | null
          scale_name: string | null
          scale_accuracy_class: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          cui?: string | null
          reg_com?: string | null
          address?: string | null
          city?: string | null
          county?: string | null
          country?: string
          phone?: string | null
          email?: string | null
          iban?: string | null
          bank?: string | null
          environment_auth?: string | null
          logo_url?: string | null
          weighing_location?: string | null
          scale_name?: string | null
          scale_accuracy_class?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          cui?: string | null
          reg_com?: string | null
          address?: string | null
          city?: string | null
          county?: string | null
          country?: string
          phone?: string | null
          email?: string | null
          iban?: string | null
          bank?: string | null
          environment_auth?: string | null
          logo_url?: string | null
          weighing_location?: string | null
          scale_name?: string | null
          scale_accuracy_class?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          phone: string | null
          role: UserRole
          company_id: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          phone?: string | null
          role?: UserRole
          company_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          phone?: string | null
          role?: UserRole
          company_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      materials: {
        Row: {
          id: string
          name: string
          unit: string
          category: MaterialCategory
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          unit?: string
          category?: MaterialCategory
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          unit?: string
          category?: MaterialCategory
          is_active?: boolean
          created_at?: string
        }
      }
      suppliers: {
        Row: {
          id: string
          company_id: string
          name: string
          cui: string | null
          reg_com: string | null
          address: string | null
          city: string | null
          county: string | null
          country: string
          work_point_address: string | null
          work_point_city: string | null
          work_point_county: string | null
          phone: string | null
          email: string | null
          contact_person: string | null
          iban: string | null
          bank: string | null
          environment_auth: string | null
          environment_auth_expiry: string | null
          is_contract: boolean
          is_punct_lucru: boolean
          is_deee: boolean
          notes: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          name: string
          cui?: string | null
          reg_com?: string | null
          address?: string | null
          city?: string | null
          county?: string | null
          country?: string
          work_point_address?: string | null
          work_point_city?: string | null
          work_point_county?: string | null
          phone?: string | null
          email?: string | null
          contact_person?: string | null
          iban?: string | null
          bank?: string | null
          environment_auth?: string | null
          environment_auth_expiry?: string | null
          is_contract?: boolean
          is_punct_lucru?: boolean
          is_deee?: boolean
          notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          name?: string
          cui?: string | null
          reg_com?: string | null
          address?: string | null
          city?: string | null
          county?: string | null
          country?: string
          work_point_address?: string | null
          work_point_city?: string | null
          work_point_county?: string | null
          phone?: string | null
          email?: string | null
          contact_person?: string | null
          iban?: string | null
          bank?: string | null
          environment_auth?: string | null
          environment_auth_expiry?: string | null
          is_contract?: boolean
          is_punct_lucru?: boolean
          is_deee?: boolean
          notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      clients: {
        Row: {
          id: string
          company_id: string
          name: string
          cui: string | null
          reg_com: string | null
          address: string | null
          city: string | null
          county: string | null
          country: string
          work_point_address: string | null
          work_point_city: string | null
          work_point_county: string | null
          phone: string | null
          email: string | null
          contact_person: string | null
          iban: string | null
          bank: string | null
          environment_auth: string | null
          environment_auth_expiry: string | null
          notes: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          name: string
          cui?: string | null
          reg_com?: string | null
          address?: string | null
          city?: string | null
          county?: string | null
          country?: string
          work_point_address?: string | null
          work_point_city?: string | null
          work_point_county?: string | null
          phone?: string | null
          email?: string | null
          contact_person?: string | null
          iban?: string | null
          bank?: string | null
          environment_auth?: string | null
          environment_auth_expiry?: string | null
          notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          name?: string
          cui?: string | null
          reg_com?: string | null
          address?: string | null
          city?: string | null
          county?: string | null
          country?: string
          work_point_address?: string | null
          work_point_city?: string | null
          work_point_county?: string | null
          phone?: string | null
          email?: string | null
          contact_person?: string | null
          iban?: string | null
          bank?: string | null
          environment_auth?: string | null
          environment_auth_expiry?: string | null
          notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      contracts: {
        Row: {
          id: string
          company_id: string
          supplier_id: string | null
          contract_number: string
          description: string | null
          start_date: string | null
          end_date: string | null
          value: number | null
          status: ContractStatus
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          supplier_id?: string | null
          contract_number: string
          description?: string | null
          start_date?: string | null
          end_date?: string | null
          value?: number | null
          status?: ContractStatus
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          supplier_id?: string | null
          contract_number?: string
          description?: string | null
          start_date?: string | null
          end_date?: string | null
          value?: number | null
          status?: ContractStatus
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      transporters: {
        Row: {
          id: string
          company_id: string
          name: string
          cui: string | null
          phone: string | null
          email: string | null
          vehicle_number: string | null
          notes: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          name: string
          cui?: string | null
          phone?: string | null
          email?: string | null
          vehicle_number?: string | null
          notes?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          name?: string
          cui?: string | null
          phone?: string | null
          email?: string | null
          vehicle_number?: string | null
          notes?: string | null
          is_active?: boolean
          created_at?: string
        }
      }
      expense_categories: {
        Row: {
          id: string
          company_id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          name?: string
          created_at?: string
        }
      }
      inventory: {
        Row: {
          id: string
          company_id: string
          material_id: string
          location_type: LocationType
          contract_id: string | null
          quantity: number
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          material_id: string
          location_type: LocationType
          contract_id?: string | null
          quantity?: number
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          material_id?: string
          location_type?: LocationType
          contract_id?: string | null
          quantity?: number
          updated_at?: string
        }
      }
      acquisitions: {
        Row: {
          id: string
          company_id: string
          date: string
          supplier_id: string | null
          environment_fund: number
          total_amount: number
          payment_status: PaymentStatus
          receipt_number: string | null
          info: string | null
          notes: string | null
          weighing_time: string | null
          vehicle_number: string | null
          vehicle_config: string | null
          transporter_name: string | null
          delegate_name: string | null
          aviz_number: string | null
          weighing_type: string | null
          weight_tara: number | null
          weight_brut: number | null
          weight_net: number | null
          operator_name: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          date?: string
          supplier_id?: string | null
          environment_fund?: number
          total_amount?: number
          payment_status?: PaymentStatus
          receipt_number?: string | null
          info?: string | null
          notes?: string | null
          weighing_time?: string | null
          vehicle_number?: string | null
          vehicle_config?: string | null
          transporter_name?: string | null
          delegate_name?: string | null
          aviz_number?: string | null
          weighing_type?: string | null
          weight_tara?: number | null
          weight_brut?: number | null
          weight_net?: number | null
          operator_name?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          date?: string
          supplier_id?: string | null
          environment_fund?: number
          total_amount?: number
          payment_status?: PaymentStatus
          receipt_number?: string | null
          info?: string | null
          notes?: string | null
          weighing_time?: string | null
          vehicle_number?: string | null
          vehicle_config?: string | null
          transporter_name?: string | null
          delegate_name?: string | null
          aviz_number?: string | null
          weighing_type?: string | null
          weight_tara?: number | null
          weight_brut?: number | null
          weight_net?: number | null
          operator_name?: string | null
          created_by?: string | null
          created_at?: string
        }
      }
      acquisition_items: {
        Row: {
          id: string
          acquisition_id: string
          material_id: string
          quantity: number
          impurities_percent: number
          final_quantity: number
          price_per_kg: number
          line_total: number
          acquisition_type: AcquisitionType
          created_at: string
        }
        Insert: {
          id?: string
          acquisition_id: string
          material_id: string
          quantity: number
          impurities_percent?: number
          final_quantity: number
          price_per_kg: number
          line_total: number
          acquisition_type?: AcquisitionType
          created_at?: string
        }
        Update: {
          id?: string
          acquisition_id?: string
          material_id?: string
          quantity?: number
          impurities_percent?: number
          final_quantity?: number
          price_per_kg?: number
          line_total?: number
          acquisition_type?: AcquisitionType
          created_at?: string
        }
      }
      sales: {
        Row: {
          id: string
          company_id: string
          date: string
          client_id: string | null
          payment_method: PaymentMethod | null
          attribution_type: AttributionType | null
          attribution_id: string | null
          transport_type: TransportType | null
          transport_price: number
          transporter_id: string | null
          vehicle_id: string | null
          driver_id: string | null
          scale_number: string | null
          notes: string | null
          status: SaleStatus
          total_amount: number
          weighing_time: string | null
          vehicle_number: string | null
          vehicle_config: string | null
          delegate_name: string | null
          aviz_number: string | null
          weighing_type: string | null
          weight_tara: number | null
          weight_brut: number | null
          weight_net: number | null
          operator_name: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          date?: string
          client_id?: string | null
          payment_method?: PaymentMethod | null
          attribution_type?: AttributionType | null
          attribution_id?: string | null
          transport_type?: TransportType | null
          transport_price?: number
          transporter_id?: string | null
          vehicle_id?: string | null
          driver_id?: string | null
          scale_number?: string | null
          notes?: string | null
          status?: SaleStatus
          total_amount?: number
          weighing_time?: string | null
          vehicle_number?: string | null
          vehicle_config?: string | null
          delegate_name?: string | null
          aviz_number?: string | null
          weighing_type?: string | null
          weight_tara?: number | null
          weight_brut?: number | null
          weight_net?: number | null
          operator_name?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          date?: string
          client_id?: string | null
          payment_method?: PaymentMethod | null
          attribution_type?: AttributionType | null
          attribution_id?: string | null
          transport_type?: TransportType | null
          transport_price?: number
          transporter_id?: string | null
          vehicle_id?: string | null
          driver_id?: string | null
          scale_number?: string | null
          notes?: string | null
          status?: SaleStatus
          total_amount?: number
          weighing_time?: string | null
          vehicle_number?: string | null
          vehicle_config?: string | null
          delegate_name?: string | null
          aviz_number?: string | null
          weighing_type?: string | null
          weight_tara?: number | null
          weight_brut?: number | null
          weight_net?: number | null
          operator_name?: string | null
          created_by?: string | null
          created_at?: string
        }
      }
      sale_items: {
        Row: {
          id: string
          sale_id: string
          material_id: string
          quantity: number
          impurities_percent: number
          final_quantity: number
          price_per_ton_usd: number | null
          exchange_rate: number | null
          price_per_kg_ron: number
          line_total: number
          created_at: string
        }
        Insert: {
          id?: string
          sale_id: string
          material_id: string
          quantity: number
          impurities_percent?: number
          final_quantity: number
          price_per_ton_usd?: number | null
          exchange_rate?: number | null
          price_per_kg_ron: number
          line_total: number
          created_at?: string
        }
        Update: {
          id?: string
          sale_id?: string
          material_id?: string
          quantity?: number
          impurities_percent?: number
          final_quantity?: number
          price_per_ton_usd?: number | null
          exchange_rate?: number | null
          price_per_kg_ron?: number
          line_total?: number
          created_at?: string
        }
      }
      receptions: {
        Row: {
          id: string
          sale_id: string
          date: string
          notes: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          sale_id: string
          date?: string
          notes?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          sale_id?: string
          date?: string
          notes?: string | null
          created_by?: string | null
          created_at?: string
        }
      }
      reception_items: {
        Row: {
          id: string
          reception_id: string
          sale_item_id: string
          final_quantity: number
          impurities_percent: number
          final_amount: number
          created_at: string
        }
        Insert: {
          id?: string
          reception_id: string
          sale_item_id: string
          final_quantity: number
          impurities_percent?: number
          final_amount: number
          created_at?: string
        }
        Update: {
          id?: string
          reception_id?: string
          sale_item_id?: string
          final_quantity?: number
          impurities_percent?: number
          final_amount?: number
          created_at?: string
        }
      }
      expenses: {
        Row: {
          id: string
          company_id: string
          date: string
          name: string
          amount: number
          type: ExpenseType
          payment_method: PaymentMethod | null
          category_id: string | null
          attribution_type: AttributionType | null
          attribution_id: string | null
          employee_id: string | null
          notes: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          date?: string
          name: string
          amount: number
          type: ExpenseType
          payment_method?: PaymentMethod | null
          category_id?: string | null
          attribution_type?: AttributionType | null
          attribution_id?: string | null
          employee_id?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          date?: string
          name?: string
          amount?: number
          type?: ExpenseType
          payment_method?: PaymentMethod | null
          category_id?: string | null
          attribution_type?: AttributionType | null
          attribution_id?: string | null
          employee_id?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
        }
      }
      dismantlings: {
        Row: {
          id: string
          company_id: string
          date: string
          location_type: 'curte' | 'contract'
          contract_id: string | null
          source_material_id: string
          source_quantity: number
          notes: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          date?: string
          location_type: 'curte' | 'contract'
          contract_id?: string | null
          source_material_id: string
          source_quantity: number
          notes?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          date?: string
          location_type?: 'curte' | 'contract'
          contract_id?: string | null
          source_material_id?: string
          source_quantity?: number
          notes?: string | null
          created_by?: string | null
          created_at?: string
        }
      }
      dismantling_outputs: {
        Row: {
          id: string
          dismantling_id: string
          material_id: string
          quantity: number
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          dismantling_id: string
          material_id: string
          quantity: number
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          dismantling_id?: string
          material_id?: string
          quantity?: number
          notes?: string | null
          created_at?: string
        }
      }
      cash_registers: {
        Row: {
          id: string
          company_id: string
          name: string
          type: CashRegisterType
          initial_balance: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          name: string
          type?: CashRegisterType
          initial_balance?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          name?: string
          type?: CashRegisterType
          initial_balance?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      cash_transactions: {
        Row: {
          id: string
          company_id: string
          cash_register_id: string
          date: string
          type: CashTransactionType
          amount: number
          description: string | null
          source_type: TransactionSourceType
          source_id: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          cash_register_id: string
          date?: string
          type: CashTransactionType
          amount: number
          description?: string | null
          source_type?: TransactionSourceType
          source_id?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          cash_register_id?: string
          date?: string
          type?: CashTransactionType
          amount?: number
          description?: string | null
          source_type?: TransactionSourceType
          source_id?: string | null
          created_by?: string | null
          created_at?: string
        }
      }
      employees: {
        Row: {
          id: string
          company_id: string
          full_name: string
          cnp: string | null
          phone: string | null
          email: string | null
          address: string | null
          position: string | null
          hire_date: string | null
          is_active: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          full_name: string
          cnp?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
          position?: string | null
          hire_date?: string | null
          is_active?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          full_name?: string
          cnp?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
          position?: string | null
          hire_date?: string | null
          is_active?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      vehicles: {
        Row: {
          id: string
          company_id: string
          vehicle_number: string
          vehicle_type: string | null
          owner_type: VehicleOwnerType
          transporter_id: string | null
          supplier_id: string | null
          driver_name: string | null
          has_transport_license: boolean
          transport_license_number: string | null
          transport_license_expiry: string | null
          notes: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          vehicle_number: string
          vehicle_type?: string | null
          owner_type?: VehicleOwnerType
          transporter_id?: string | null
          supplier_id?: string | null
          driver_name?: string | null
          has_transport_license?: boolean
          transport_license_number?: string | null
          transport_license_expiry?: string | null
          notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          vehicle_number?: string
          vehicle_type?: string | null
          owner_type?: VehicleOwnerType
          transporter_id?: string | null
          supplier_id?: string | null
          driver_name?: string | null
          has_transport_license?: boolean
          transport_license_number?: string | null
          transport_license_expiry?: string | null
          notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      drivers: {
        Row: {
          id: string
          company_id: string
          name: string
          id_series: string | null
          id_number: string | null
          phone: string | null
          owner_type: VehicleOwnerType
          transporter_id: string | null
          supplier_id: string | null
          notes: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          name: string
          id_series?: string | null
          id_number?: string | null
          phone?: string | null
          owner_type?: VehicleOwnerType
          transporter_id?: string | null
          supplier_id?: string | null
          notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          name?: string
          id_series?: string | null
          id_number?: string | null
          phone?: string | null
          owner_type?: VehicleOwnerType
          transporter_id?: string | null
          supplier_id?: string | null
          notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      vehicle_drivers: {
        Row: {
          id: string
          vehicle_id: string
          driver_id: string
          is_primary: boolean
          created_at: string
        }
        Insert: {
          id?: string
          vehicle_id: string
          driver_id: string
          is_primary?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          vehicle_id?: string
          driver_id?: string
          is_primary?: boolean
          created_at?: string
        }
      }
    }
  }
}

// Convenience types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Aliased types for easier use
export type Company = Tables<'companies'>
export type Profile = Tables<'profiles'>
export type Material = Tables<'materials'>
export type Supplier = Tables<'suppliers'>
export type Client = Tables<'clients'>
export type Contract = Tables<'contracts'>
export type Transporter = Tables<'transporters'>
export type ExpenseCategory = Tables<'expense_categories'>
export type Inventory = Tables<'inventory'>
export type Acquisition = Tables<'acquisitions'>
export type AcquisitionItem = Tables<'acquisition_items'>
export type Sale = Tables<'sales'>
export type SaleItem = Tables<'sale_items'>
export type Reception = Tables<'receptions'>
export type ReceptionItem = Tables<'reception_items'>
export type Expense = Tables<'expenses'>
export type Dismantling = Tables<'dismantlings'>
export type DismantlingOutput = Tables<'dismantling_outputs'>
export type CashRegister = Tables<'cash_registers'>
export type CashTransaction = Tables<'cash_transactions'>
export type Employee = Tables<'employees'>
export type Vehicle = Tables<'vehicles'>
export type Driver = Tables<'drivers'>
export type VehicleDriver = Tables<'vehicle_drivers'>

// Extended types with relations
export interface AcquisitionWithItems extends Acquisition {
  supplier?: Supplier | null
  items: (AcquisitionItem & { material: Material })[]
}

export interface SaleWithItems extends Sale {
  client?: Client | null
  transporter?: Transporter | null
  items: (SaleItem & { material: Material })[]
  reception?: Reception | null
}

export interface DismantlingWithDetails extends Dismantling {
  source_material: Material
  contract?: Contract | null
  outputs: (DismantlingOutput & { material: Material })[]
}

export interface InventoryWithMaterial extends Inventory {
  material: Material
  contract?: Contract | null
}

export interface ProfileWithCompany extends Profile {
  company?: Company | null
}

export interface VehicleWithTransporter extends Vehicle {
  transporter?: Transporter | null
}

export interface VehicleWithRelations extends Vehicle {
  transporter?: Transporter | null
  supplier?: Supplier | null
  drivers?: Driver[]
}

export interface DriverWithRelations extends Driver {
  transporter?: Transporter | null
  supplier?: Supplier | null
  vehicles?: Vehicle[]
}
