// App.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import * as XLSX from 'xlsx';
const App = () => {
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('debit');
  const [description, setDescription] = useState('');
  const [currentBalance, setCurrentBalance] = useState(0);
  const [monthlySummary, setMonthlySummary] = useState({ income: 0, expenditure: 0 });
  const [transactions, setTransactions] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchCurrentBalance();
    fetchMonthlySummary();
  }, []);

  const fetchCurrentBalance = async () => {
    const response = await axios.get('http://localhost:5000/current_balance');
    setCurrentBalance(response.data.current_balance);
  };

  const fetchMonthlySummary = async () => {
    const response = await axios.get('http://localhost:5000/monthly_summary');
    setMonthlySummary(response.data);
  };

  const handleAddExpense = async () => {
    if (!amount) return alert('Please enter an amount');

    await axios.post('http://localhost:5000/add_expense', {
      amount: parseFloat(amount),
      type,
      description,
    });
    fetchCurrentBalance();
    fetchMonthlySummary();
    setAmount('');
    setDescription('');
  };

  const fetchTransactions = async () => {
    if (!startDate || !endDate) {
      alert('Please select both start and end dates.');
      return;
    }
    const response = await axios.post('http://localhost:5000/transactions', {
      start_date: startDate,
      end_date: endDate,
    });
    setTransactions(response.data.transactions);
  };

  const handleDeleteTransaction = async (id) => {
    try {
      await axios.delete('http://localhost:5000/delete_expense', {
        data: { id },
      });
      alert('Transaction deleted successfully!');
      fetchTransactions(); // Refresh the transactions
      fetchCurrentBalance(); // Refresh the balance
      fetchMonthlySummary(); // Refresh the summary
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert('Failed to delete transaction.');
    }
  };
  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(transactions);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');
    XLSX.writeFile(workbook, 'transactions.xlsx');
  };

  return (
    <div className="app-container dark-mode">
      <h1>Expense Tracker</h1>

      <div className="section">
        <h2>Add Expense</h2>
        <div className="amount-select-container">
          <input
            type="number"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="debit">Debit</option>
            <option value="credit">Credit</option>
          </select>
        </div>
        <input
          type="text"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="full-width"
        />
        <button onClick={handleAddExpense}>Add Expense</button>
      </div>

      <div className="section rounded-box balance-section">
        <h2>Current Balance</h2>
        <p className="balance-amount">₨ {currentBalance.toFixed(2)}</p>
      </div>

      <div className="section rounded-box">
        <h2>Monthly Summary</h2>
        <div className="summary-container">
          <p className="balance-amount">Income: ₨ {monthlySummary.income.toFixed(2)}</p>
          <p className="balance-amount">Expenditure: ₨ {monthlySummary.expenditure.toFixed(2)}</p>
        </div>
      </div>

      <div className="section rounded-box">
        <h2>View Transactions</h2>
        <div className="date-input-container">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="date-input"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="date-input"
          />
        </div>
        <button 
        onClick={fetchTransactions}>Fetch Transactions
        </button>
        

        <table className="transaction-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Description</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction) => (
              <tr key={transaction.id}>
                <td>{transaction.date}</td>
                <td>{transaction.type}</td>
                <td>₨ {transaction.amount.toFixed(2)}</td>
                <td>{transaction.description || 'N/A'}</td>
                <td>
                  <button
                    className="delete-button"
                    onClick={() => handleDeleteTransaction(transaction.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button onClick={exportToExcel} className="export-button">Export to Excel</button>
    </div>
  );
};

export default App;
