import { createContext, useContext, useEffect, useMemo, useReducer } from 'react'
import type { ReactNode } from 'react'
import { v4 as uuid } from 'uuid'
import type { Constraints, Employee, PlanningData, VacationRequest } from '../types'
import { defaultPlanningData, loadPlanningData, savePlanningData } from './persistence'

type Action =
  | { type: 'SET_YEAR'; year: number }
  | { type: 'ADD_EMPLOYEE'; employee: Omit<Employee, 'id'> }
  | { type: 'UPDATE_EMPLOYEE'; employee: Employee }
  | { type: 'DELETE_EMPLOYEE'; id: string }
  | { type: 'ADD_REQUEST'; request: Omit<VacationRequest, 'id'> }
  | { type: 'UPDATE_REQUEST'; request: VacationRequest }
  | { type: 'DELETE_REQUEST'; id: string }
  | { type: 'UPDATE_CONSTRAINTS'; constraints: Constraints }
  | { type: 'IMPORT_DATA'; data: PlanningData }
  | { type: 'RESET_DATA'; year: number }

function reducer(state: PlanningData, action: Action): PlanningData {
  switch (action.type) {
    case 'SET_YEAR':
      return {
        ...state,
        year: action.year,
        requests: state.requests.map((r) => ({ ...r, year: action.year })),
      }
    case 'ADD_EMPLOYEE':
      return { ...state, employees: [...state.employees, { ...action.employee, id: uuid() }] }
    case 'UPDATE_EMPLOYEE':
      return {
        ...state,
        employees: state.employees.map((e) => (e.id === action.employee.id ? action.employee : e)),
      }
    case 'DELETE_EMPLOYEE':
      return {
        ...state,
        employees: state.employees.filter((e) => e.id !== action.id),
        requests: state.requests.filter((r) => r.employeeId !== action.id),
      }
    case 'ADD_REQUEST':
      return { ...state, requests: [...state.requests, { ...action.request, id: uuid() }] }
    case 'UPDATE_REQUEST':
      return {
        ...state,
        requests: state.requests.map((r) => (r.id === action.request.id ? action.request : r)),
      }
    case 'DELETE_REQUEST':
      return { ...state, requests: state.requests.filter((r) => r.id !== action.id) }
    case 'UPDATE_CONSTRAINTS':
      return { ...state, constraints: action.constraints }
    case 'IMPORT_DATA':
      return action.data
    case 'RESET_DATA':
      return defaultPlanningData(action.year)
    default:
      return state
  }
}

interface PlanningContextValue {
  data: PlanningData
  setYear: (year: number) => void
  addEmployee: (employee: Omit<Employee, 'id'>) => void
  updateEmployee: (employee: Employee) => void
  deleteEmployee: (id: string) => void
  addRequest: (request: Omit<VacationRequest, 'id'>) => void
  updateRequest: (request: VacationRequest) => void
  deleteRequest: (id: string) => void
  updateConstraints: (constraints: Constraints) => void
  importData: (data: PlanningData) => void
  resetData: () => void
}

const PlanningContext = createContext<PlanningContextValue | null>(null)

export function PlanningProvider({ children }: { children: ReactNode }) {
  const initial = useMemo(() => loadPlanningData() ?? defaultPlanningData(new Date().getFullYear()), [])
  const [data, dispatch] = useReducer(reducer, initial)

  useEffect(() => {
    savePlanningData(data)
  }, [data])

  const value: PlanningContextValue = {
    data,
    setYear: (year) => dispatch({ type: 'SET_YEAR', year }),
    addEmployee: (employee) => dispatch({ type: 'ADD_EMPLOYEE', employee }),
    updateEmployee: (employee) => dispatch({ type: 'UPDATE_EMPLOYEE', employee }),
    deleteEmployee: (id) => dispatch({ type: 'DELETE_EMPLOYEE', id }),
    addRequest: (request) => dispatch({ type: 'ADD_REQUEST', request }),
    updateRequest: (request) => dispatch({ type: 'UPDATE_REQUEST', request }),
    deleteRequest: (id) => dispatch({ type: 'DELETE_REQUEST', id }),
    updateConstraints: (constraints) => dispatch({ type: 'UPDATE_CONSTRAINTS', constraints }),
    importData: (importedData) => dispatch({ type: 'IMPORT_DATA', data: importedData }),
    resetData: () => dispatch({ type: 'RESET_DATA', year: data.year }),
  }

  return <PlanningContext.Provider value={value}>{children}</PlanningContext.Provider>
}

export function usePlanning(): PlanningContextValue {
  const ctx = useContext(PlanningContext)
  if (!ctx) throw new Error('usePlanning must be used within a PlanningProvider')
  return ctx
}
