import { Fragment, useCallback, useEffect, useMemo, useState } from "react"
import { InputSelect } from "./components/InputSelect"
import { Instructions } from "./components/Instructions"
import { Transactions } from "./components/Transactions"
import { useEmployees } from "./hooks/useEmployees"
import { usePaginatedTransactions } from "./hooks/usePaginatedTransactions"
import { useTransactionsByEmployee } from "./hooks/useTransactionsByEmployee"
import { EMPTY_EMPLOYEE } from "./utils/constants"
import { Employee, Transaction } from "./utils/types"

export function App() {
  const { data: employees, ...employeeUtils } = useEmployees()
  const { data: paginatedTransactions, ...paginatedTransactionsUtils } = usePaginatedTransactions()
  const { data: transactionsByEmployee, ...transactionsByEmployeeUtils } = useTransactionsByEmployee()
  console.log(paginatedTransactions, transactionsByEmployee)
  const [isLoading, setIsLoading] = useState(false)
  const [employeeLoading, setEmployeeLoading] = useState(false)

  // const transactions = useMemo(
  //   () => paginatedTransactions?.data ?? transactionsByEmployee ?? null,
  //   [paginatedTransactions, transactionsByEmployee]
  // )
  // FIX OF BUG-4:
  const [transactions, setTransactions] = useState<Transaction[] | null>(null)

  //FIX OF BUG-6:
  const [nextPage, setNextPage] = useState<number | null>(null)

  useEffect(() => {
    if (!transactionsByEmployee) {
      setTransactions((transaction) => {
        if (paginatedTransactions?.nextPage === 1 && paginatedTransactions?.data) {
          setNextPage(paginatedTransactions.nextPage)
          return paginatedTransactions.data
        } else if (
          transaction &&
          paginatedTransactions?.data &&
          (paginatedTransactions?.nextPage || 2) > 1
        ) {
          setNextPage(paginatedTransactions?.nextPage)
          return [...transaction, ...paginatedTransactions.data]
        }
        return transaction
      })
    }
    if (transactionsByEmployee) {
      setNextPage(null)
      setTransactions(transactionsByEmployee)
    }
  }, [paginatedTransactions, transactionsByEmployee])

  const loadAllTransactions = useCallback(async () => {
    setIsLoading(true)
    transactionsByEmployeeUtils.invalidateData()

    // FIX OF BUG-5:
    setEmployeeLoading(true)
    await employeeUtils.fetchAll()
    setEmployeeLoading(false)
    await paginatedTransactionsUtils.fetchAll()

    setIsLoading(false)
  }, [employeeUtils, paginatedTransactionsUtils, transactionsByEmployeeUtils])

  const loadTransactionsByEmployee = useCallback(
    async (employeeId: string) => {
      paginatedTransactionsUtils.invalidateData()
      //FIX OF BUG-3:
      if (!employeeId) {
        return loadAllTransactions()
      }
      await transactionsByEmployeeUtils.fetchById(employeeId)
    },
    [paginatedTransactionsUtils, transactionsByEmployeeUtils, loadAllTransactions]
  )

  useEffect(() => {
    if (employees === null && !employeeUtils.loading) {
      loadAllTransactions()
    }
  }, [employeeUtils.loading, employees, loadAllTransactions])
  return (
    <Fragment>
      <main className="MainContainer">
        <Instructions />

        <hr className="RampBreak--l" />

        <InputSelect<Employee>
          isLoading={employeeLoading}
          defaultValue={EMPTY_EMPLOYEE}
          items={employees === null ? [] : [EMPTY_EMPLOYEE, ...employees]}
          label="Filter by employee"
          loadingLabel="Loading employees"
          parseItem={(item) => ({
            value: item.id,
            label: `${item.firstName} ${item.lastName}`,
          })}
          onChange={async (newValue) => {
            if (newValue === null) {
              return
            }

            await loadTransactionsByEmployee(newValue.id)
          }}
        />

        <div className="RampBreak--l" />

        <div className="RampGrid">
          <Transactions
            transactions={transactions}
            clearCache={() => {
              transactionsByEmployeeUtils.clearCacheByEndpoint(["transactionsByEmployee"])
            }}
          />

          {transactions !== null && nextPage && (
            <button
              className="RampButton"
              disabled={paginatedTransactionsUtils.loading}
              onClick={async () => {
                await loadAllTransactions()
              }}
            >
              View More
            </button>
          )}
        </div>
      </main>
    </Fragment>
  )
}
