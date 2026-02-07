export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      acquisition_items: {
        Row: {
          acquisition_id: string
          acquisition_type: Database["public"]["Enums"]["acq_item_type"] | null
          created_at: string
          final_quantity: number
          id: string
          impurities_percent: number
          line_total: number
          material_id: string
          price_per_kg: number
          quantity: number
        }
        Insert: {
          acquisition_id: string
          acquisition_type?: Database["public"]["Enums"]["acq_item_type"] | null
          created_at?: string
          final_quantity: number
          id?: string
          impurities_percent?: number
          line_total: number
          material_id: string
          price_per_kg: number
          quantity: number
        }
        Update: {
          acquisition_id?: string
          acquisition_type?: Database["public"]["Enums"]["acq_item_type"] | null
          created_at?: string
          final_quantity?: number
          id?: string
          impurities_percent?: number
          line_total?: number
          material_id?: string
          price_per_kg?: number
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "acquisition_items_acquisition_id_fkey"
            columns: ["acquisition_id"]
            isOneToOne: false
            referencedRelation: "acquisitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acquisition_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      acquisitions: {
        Row: {
          company_id: string
          contract_id: string | null
          created_at: string
          created_by: string | null
          date: string
          driver_id: string | null
          environment_fund: number | null
          goes_to_accounting: boolean | null
          id: string
          info: string | null
          is_natural_person: boolean | null
          location_type: string
          notes: string | null
          payment_status: string
          receipt_number: string | null
          supplier_id: string | null
          tax_amount: number | null
          total_amount: number
          transport_price: number | null
          transport_type: string | null
          transporter_id: string | null
          vehicle_id: string | null
        }
        Insert: {
          company_id: string
          contract_id?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          driver_id?: string | null
          environment_fund?: number | null
          goes_to_accounting?: boolean | null
          id?: string
          info?: string | null
          is_natural_person?: boolean | null
          location_type?: string
          notes?: string | null
          payment_status?: string
          receipt_number?: string | null
          supplier_id?: string | null
          tax_amount?: number | null
          total_amount?: number
          transport_price?: number | null
          transport_type?: string | null
          transporter_id?: string | null
          vehicle_id?: string | null
        }
        Update: {
          company_id?: string
          contract_id?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          driver_id?: string | null
          environment_fund?: number | null
          goes_to_accounting?: boolean | null
          id?: string
          info?: string | null
          is_natural_person?: boolean | null
          location_type?: string
          notes?: string | null
          payment_status?: string
          receipt_number?: string | null
          supplier_id?: string | null
          tax_amount?: number | null
          total_amount?: number
          transport_price?: number | null
          transport_type?: string | null
          transporter_id?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "acquisitions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acquisitions_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acquisitions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acquisitions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acquisitions_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acquisitions_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_registers: {
        Row: {
          company_id: string
          created_at: string
          id: string
          initial_balance: number
          is_active: boolean
          name: string
          type: Database["public"]["Enums"]["cash_register_type"]
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          initial_balance?: number
          is_active?: boolean
          name: string
          type?: Database["public"]["Enums"]["cash_register_type"]
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          initial_balance?: number
          is_active?: boolean
          name?: string
          type?: Database["public"]["Enums"]["cash_register_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_registers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_transactions: {
        Row: {
          amount: number
          cash_register_id: string
          company_id: string
          created_at: string
          created_by: string | null
          date: string
          description: string | null
          id: string
          source_id: string | null
          source_type: Database["public"]["Enums"]["transaction_source_type"]
          type: Database["public"]["Enums"]["cash_transaction_type"]
        }
        Insert: {
          amount: number
          cash_register_id: string
          company_id: string
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string | null
          id?: string
          source_id?: string | null
          source_type?: Database["public"]["Enums"]["transaction_source_type"]
          type: Database["public"]["Enums"]["cash_transaction_type"]
        }
        Update: {
          amount?: number
          cash_register_id?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string | null
          id?: string
          source_id?: string | null
          source_type?: Database["public"]["Enums"]["transaction_source_type"]
          type?: Database["public"]["Enums"]["cash_transaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "cash_transactions_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "cash_register_daily_summary"
            referencedColumns: ["cash_register_id"]
          },
          {
            foreignKeyName: "cash_transactions_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          bank: string | null
          city: string | null
          company_id: string
          contact_person: string | null
          country: string | null
          county: string | null
          created_at: string
          cui: string | null
          email: string | null
          environment_auth: string | null
          environment_auth_expiry: string | null
          iban: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          phone: string | null
          reg_com: string | null
          updated_at: string
          work_point_address: string | null
          work_point_city: string | null
          work_point_county: string | null
        }
        Insert: {
          address?: string | null
          bank?: string | null
          city?: string | null
          company_id: string
          contact_person?: string | null
          country?: string | null
          county?: string | null
          created_at?: string
          cui?: string | null
          email?: string | null
          environment_auth?: string | null
          environment_auth_expiry?: string | null
          iban?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          reg_com?: string | null
          updated_at?: string
          work_point_address?: string | null
          work_point_city?: string | null
          work_point_county?: string | null
        }
        Update: {
          address?: string | null
          bank?: string | null
          city?: string | null
          company_id?: string
          contact_person?: string | null
          country?: string | null
          county?: string | null
          created_at?: string
          cui?: string | null
          email?: string | null
          environment_auth?: string | null
          environment_auth_expiry?: string | null
          iban?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          reg_com?: string | null
          updated_at?: string
          work_point_address?: string | null
          work_point_city?: string | null
          work_point_county?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          bank: string | null
          city: string | null
          country: string | null
          county: string | null
          created_at: string
          cui: string | null
          email: string | null
          environment_auth: string | null
          iban: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          phone: string | null
          reg_com: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          bank?: string | null
          city?: string | null
          country?: string | null
          county?: string | null
          created_at?: string
          cui?: string | null
          email?: string | null
          environment_auth?: string | null
          iban?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          phone?: string | null
          reg_com?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          bank?: string | null
          city?: string | null
          country?: string | null
          county?: string | null
          created_at?: string
          cui?: string | null
          email?: string | null
          environment_auth?: string | null
          iban?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          phone?: string | null
          reg_com?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      contracts: {
        Row: {
          company_id: string
          contract_number: string
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          notes: string | null
          start_date: string | null
          status: string
          supplier_id: string | null
          updated_at: string
          value: number | null
        }
        Insert: {
          company_id: string
          contract_number: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          start_date?: string | null
          status?: string
          supplier_id?: string | null
          updated_at?: string
          value?: number | null
        }
        Update: {
          company_id?: string
          contract_number?: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          start_date?: string | null
          status?: string
          supplier_id?: string | null
          updated_at?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      dismantling_outputs: {
        Row: {
          created_at: string
          dismantling_id: string
          id: string
          material_id: string
          notes: string | null
          quantity: number
        }
        Insert: {
          created_at?: string
          dismantling_id: string
          id?: string
          material_id: string
          notes?: string | null
          quantity: number
        }
        Update: {
          created_at?: string
          dismantling_id?: string
          id?: string
          material_id?: string
          notes?: string | null
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "dismantling_outputs_dismantling_id_fkey"
            columns: ["dismantling_id"]
            isOneToOne: false
            referencedRelation: "dismantlings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dismantling_outputs_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      dismantlings: {
        Row: {
          company_id: string
          contract_id: string | null
          created_at: string
          created_by: string | null
          date: string
          id: string
          location_type: string
          notes: string | null
          source_material_id: string
          source_quantity: number
        }
        Insert: {
          company_id: string
          contract_id?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          location_type: string
          notes?: string | null
          source_material_id: string
          source_quantity: number
        }
        Update: {
          company_id?: string
          contract_id?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          location_type?: string
          notes?: string | null
          source_material_id?: string
          source_quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "dismantlings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dismantlings_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dismantlings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dismantlings_source_material_id_fkey"
            columns: ["source_material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          company_id: string
          created_at: string
          id: string
          id_number: string | null
          id_series: string | null
          is_active: boolean
          name: string
          notes: string | null
          owner_type: Database["public"]["Enums"]["vehicle_owner_type"]
          phone: string | null
          supplier_id: string | null
          transporter_id: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          id_number?: string | null
          id_series?: string | null
          is_active?: boolean
          name: string
          notes?: string | null
          owner_type?: Database["public"]["Enums"]["vehicle_owner_type"]
          phone?: string | null
          supplier_id?: string | null
          transporter_id?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          id_number?: string | null
          id_series?: string | null
          is_active?: boolean
          name?: string
          notes?: string | null
          owner_type?: Database["public"]["Enums"]["vehicle_owner_type"]
          phone?: string | null
          supplier_id?: string | null
          transporter_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "drivers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drivers_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drivers_transporter_id_fkey"
            columns: ["transporter_id"]
            isOneToOne: false
            referencedRelation: "transporters"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          address: string | null
          cnp: string | null
          company_id: string
          created_at: string
          email: string | null
          full_name: string
          hire_date: string | null
          id: string
          is_active: boolean
          notes: string | null
          phone: string | null
          position: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          cnp?: string | null
          company_id: string
          created_at?: string
          email?: string | null
          full_name: string
          hire_date?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          phone?: string | null
          position?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          cnp?: string | null
          company_id?: string
          created_at?: string
          email?: string | null
          full_name?: string
          hire_date?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          phone?: string | null
          position?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          company_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          attribution_id: string | null
          attribution_type: string | null
          category_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          date: string
          employee_id: string | null
          id: string
          name: string
          notes: string | null
          payment_method: string | null
          type: string
        }
        Insert: {
          amount: number
          attribution_id?: string | null
          attribution_type?: string | null
          category_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          date?: string
          employee_id?: string | null
          id?: string
          name: string
          notes?: string | null
          payment_method?: string | null
          type: string
        }
        Update: {
          amount?: number
          attribution_id?: string | null
          attribution_type?: string | null
          category_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          date?: string
          employee_id?: string | null
          id?: string
          name?: string
          notes?: string | null
          payment_method?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          company_id: string
          contract_id: string | null
          id: string
          location_type: string
          material_id: string
          quantity: number
          updated_at: string
        }
        Insert: {
          company_id: string
          contract_id?: string | null
          id?: string
          location_type: string
          material_id: string
          quantity?: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          contract_id?: string | null
          id?: string
          location_type?: string
          material_id?: string
          quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          category: Database["public"]["Enums"]["material_category"] | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          unit: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["material_category"] | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          unit?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["material_category"] | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          unit?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          company_id: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_active: boolean
          phone: string | null
          role: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      reception_items: {
        Row: {
          created_at: string
          final_amount: number
          final_quantity: number
          id: string
          impurities_percent: number
          reception_id: string
          sale_item_id: string
        }
        Insert: {
          created_at?: string
          final_amount: number
          final_quantity: number
          id?: string
          impurities_percent?: number
          reception_id: string
          sale_item_id: string
        }
        Update: {
          created_at?: string
          final_amount?: number
          final_quantity?: number
          id?: string
          impurities_percent?: number
          reception_id?: string
          sale_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reception_items_reception_id_fkey"
            columns: ["reception_id"]
            isOneToOne: false
            referencedRelation: "receptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reception_items_sale_item_id_fkey"
            columns: ["sale_item_id"]
            isOneToOne: false
            referencedRelation: "sale_items"
            referencedColumns: ["id"]
          },
        ]
      }
      receptions: {
        Row: {
          created_at: string
          created_by: string | null
          date: string
          id: string
          notes: string | null
          sale_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          notes?: string | null
          sale_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          notes?: string | null
          sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "receptions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receptions_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          created_at: string
          exchange_rate: number | null
          final_quantity: number
          id: string
          impurities_percent: number
          line_total: number
          material_id: string
          price_per_kg_ron: number
          price_per_ton_usd: number | null
          quantity: number
          sale_id: string
        }
        Insert: {
          created_at?: string
          exchange_rate?: number | null
          final_quantity: number
          id?: string
          impurities_percent?: number
          line_total: number
          material_id: string
          price_per_kg_ron: number
          price_per_ton_usd?: number | null
          quantity: number
          sale_id: string
        }
        Update: {
          created_at?: string
          exchange_rate?: number | null
          final_quantity?: number
          id?: string
          impurities_percent?: number
          line_total?: number
          material_id?: string
          price_per_kg_ron?: number
          price_per_ton_usd?: number | null
          quantity?: number
          sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          attribution_id: string | null
          attribution_type: string | null
          client_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          date: string
          driver_id: string | null
          goes_to_accounting: boolean | null
          id: string
          notes: string | null
          payment_method: string | null
          payment_status: string | null
          scale_number: string | null
          status: string
          total_amount: number
          transport_price: number | null
          transport_type: string | null
          transporter_id: string | null
          vehicle_id: string | null
        }
        Insert: {
          attribution_id?: string | null
          attribution_type?: string | null
          client_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          date?: string
          driver_id?: string | null
          goes_to_accounting?: boolean | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          payment_status?: string | null
          scale_number?: string | null
          status?: string
          total_amount?: number
          transport_price?: number | null
          transport_type?: string | null
          transporter_id?: string | null
          vehicle_id?: string | null
        }
        Update: {
          attribution_id?: string | null
          attribution_type?: string | null
          client_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          date?: string
          driver_id?: string | null
          goes_to_accounting?: boolean | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          payment_status?: string | null
          scale_number?: string | null
          status?: string
          total_amount?: number
          transport_price?: number | null
          transport_type?: string | null
          transporter_id?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_transporter_id_fkey"
            columns: ["transporter_id"]
            isOneToOne: false
            referencedRelation: "transporters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          bank: string | null
          city: string | null
          company_id: string
          contact_person: string | null
          country: string | null
          county: string | null
          created_at: string
          cui: string | null
          email: string | null
          environment_auth: string | null
          environment_auth_expiry: string | null
          iban: string | null
          id: string
          is_active: boolean
          is_contract: boolean
          is_deee: boolean
          is_punct_lucru: boolean
          name: string
          notes: string | null
          phone: string | null
          reg_com: string | null
          updated_at: string
          work_point_address: string | null
          work_point_city: string | null
          work_point_county: string | null
        }
        Insert: {
          address?: string | null
          bank?: string | null
          city?: string | null
          company_id: string
          contact_person?: string | null
          country?: string | null
          county?: string | null
          created_at?: string
          cui?: string | null
          email?: string | null
          environment_auth?: string | null
          environment_auth_expiry?: string | null
          iban?: string | null
          id?: string
          is_active?: boolean
          is_contract?: boolean
          is_deee?: boolean
          is_punct_lucru?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          reg_com?: string | null
          updated_at?: string
          work_point_address?: string | null
          work_point_city?: string | null
          work_point_county?: string | null
        }
        Update: {
          address?: string | null
          bank?: string | null
          city?: string | null
          company_id?: string
          contact_person?: string | null
          country?: string | null
          county?: string | null
          created_at?: string
          cui?: string | null
          email?: string | null
          environment_auth?: string | null
          environment_auth_expiry?: string | null
          iban?: string | null
          id?: string
          is_active?: boolean
          is_contract?: boolean
          is_deee?: boolean
          is_punct_lucru?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          reg_com?: string | null
          updated_at?: string
          work_point_address?: string | null
          work_point_city?: string | null
          work_point_county?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      transporters: {
        Row: {
          company_id: string
          created_at: string
          cui: string | null
          email: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          phone: string | null
          vehicle_number: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          cui?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          vehicle_number?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          cui?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          vehicle_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transporters_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_drivers: {
        Row: {
          created_at: string
          driver_id: string
          id: string
          is_primary: boolean | null
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          driver_id: string
          id?: string
          is_primary?: boolean | null
          vehicle_id: string
        }
        Update: {
          created_at?: string
          driver_id?: string
          id?: string
          is_primary?: boolean | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_drivers_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_drivers_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          company_id: string
          created_at: string
          driver_name: string | null
          has_transport_license: boolean | null
          id: string
          is_active: boolean
          is_own_fleet: boolean
          notes: string | null
          owner_type: Database["public"]["Enums"]["vehicle_owner_type"]
          supplier_id: string | null
          transport_license_expiry: string | null
          transport_license_number: string | null
          transporter_id: string | null
          updated_at: string
          vehicle_number: string
          vehicle_type: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          driver_name?: string | null
          has_transport_license?: boolean | null
          id?: string
          is_active?: boolean
          is_own_fleet?: boolean
          notes?: string | null
          owner_type?: Database["public"]["Enums"]["vehicle_owner_type"]
          supplier_id?: string | null
          transport_license_expiry?: string | null
          transport_license_number?: string | null
          transporter_id?: string | null
          updated_at?: string
          vehicle_number: string
          vehicle_type?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          driver_name?: string | null
          has_transport_license?: boolean | null
          id?: string
          is_active?: boolean
          is_own_fleet?: boolean
          notes?: string | null
          owner_type?: Database["public"]["Enums"]["vehicle_owner_type"]
          supplier_id?: string | null
          transport_license_expiry?: string | null
          transport_license_number?: string | null
          transporter_id?: string | null
          updated_at?: string
          vehicle_number?: string
          vehicle_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_transporter_id_fkey"
            columns: ["transporter_id"]
            isOneToOne: false
            referencedRelation: "transporters"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      cash_register_daily_summary: {
        Row: {
          cash_register_id: string | null
          closing_balance: number | null
          company_id: string | null
          daily_expense: number | null
          daily_income: number | null
          date: string | null
          initial_balance: number | null
          is_active: boolean | null
          name: string | null
          opening_balance: number | null
          type: Database["public"]["Enums"]["cash_register_type"] | null
        }
        Insert: {
          cash_register_id?: string | null
          closing_balance?: never
          company_id?: string | null
          daily_expense?: never
          daily_income?: never
          date?: never
          initial_balance?: number | null
          is_active?: boolean | null
          name?: string | null
          opening_balance?: never
          type?: Database["public"]["Enums"]["cash_register_type"] | null
        }
        Update: {
          cash_register_id?: string | null
          closing_balance?: never
          company_id?: string | null
          daily_expense?: never
          daily_income?: never
          date?: never
          initial_balance?: number | null
          is_active?: boolean | null
          name?: string | null
          opening_balance?: never
          type?: Database["public"]["Enums"]["cash_register_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_registers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_cash_register_balance: {
        Args: { p_cash_register_id: string; p_date?: string }
        Returns: number
      }
      get_user_company_id: { Args: never; Returns: string }
      is_super_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      acq_item_type: "normal" | "zero" | "director" | "stoc"
      cash_register_type: "cash" | "bank"
      cash_transaction_type: "income" | "expense"
      material_category: "feros" | "neferos" | "deee" | "altele"
      transaction_source_type: "manual" | "acquisition" | "sale" | "expense"
      vehicle_owner_type: "own_fleet" | "transporter" | "supplier"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      acq_item_type: ["normal", "zero", "director", "stoc"],
      cash_register_type: ["cash", "bank"],
      cash_transaction_type: ["income", "expense"],
      material_category: ["feros", "neferos", "deee", "altele"],
      transaction_source_type: ["manual", "acquisition", "sale", "expense"],
      vehicle_owner_type: ["own_fleet", "transporter", "supplier"],
    },
  },
} as const

// =====================================================
// Custom Type Aliases & Helpers
// =====================================================

// Helper types for Insert and Update
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Base entity types (using Database directly to avoid conflict with Tables helper)
export type Company = Database['public']['Tables']['companies']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Material = Database['public']['Tables']['materials']['Row']
export type Supplier = Database['public']['Tables']['suppliers']['Row']
export type Client = Database['public']['Tables']['clients']['Row']
export type Contract = Database['public']['Tables']['contracts']['Row']
export type Transporter = Database['public']['Tables']['transporters']['Row']
export type Inventory = Database['public']['Tables']['inventory']['Row']
export type ExpenseCategory = Database['public']['Tables']['expense_categories']['Row']
export type Acquisition = Database['public']['Tables']['acquisitions']['Row']
export type AcquisitionItem = Database['public']['Tables']['acquisition_items']['Row']
export type Sale = Database['public']['Tables']['sales']['Row']
export type SaleItem = Database['public']['Tables']['sale_items']['Row']
export type Reception = Database['public']['Tables']['receptions']['Row']
export type ReceptionItem = Database['public']['Tables']['reception_items']['Row']
export type Expense = Database['public']['Tables']['expenses']['Row']
export type Dismantling = Database['public']['Tables']['dismantlings']['Row']
export type DismantlingOutput = Database['public']['Tables']['dismantling_outputs']['Row']
export type CashRegister = Database['public']['Tables']['cash_registers']['Row']
export type CashTransaction = Database['public']['Tables']['cash_transactions']['Row']
export type Employee = Database['public']['Tables']['employees']['Row']
export type Vehicle = Database['public']['Tables']['vehicles']['Row']
export type Driver = Database['public']['Tables']['drivers']['Row']
export type VehicleDriver = Database['public']['Tables']['vehicle_drivers']['Row']

// Extended types with relations
export interface AcquisitionWithItems extends Acquisition {
  supplier?: Supplier | null
  contract?: Contract | null
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

// Enum types
export type LocationType = 'curte' | 'contract' | 'deee'
export type PaymentMethod = 'cash' | 'bank'
export type PaymentStatus = 'paid' | 'unpaid' | 'partial'
export type TransportType = 'intern' | 'extern'
export type SaleStatus = 'pending' | 'reception_done' | 'cancelled'
export type MaterialCategory = 'feros' | 'neferos' | 'deee' | 'altele'
export type AcquisitionType = 'normal' | 'zero' | 'director' | 'stoc'
export type VehicleOwnerType = 'own_fleet' | 'transporter' | 'supplier'
export type CashRegisterType = 'cash' | 'bank'
export type CashTransactionType = 'income' | 'expense'
export type TransactionSourceType = 'manual' | 'acquisition' | 'sale' | 'expense'
export type UserRole = 'super_admin' | 'admin' | 'operator' | 'viewer'
export type ExpenseType = 'payment' | 'collection'
export type AttributionType = 'curte' | 'contract'
