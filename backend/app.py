from flask import Flask, request, jsonify
import sqlite3
from datetime import datetime
from flask_cors import CORS

app = Flask(__name__)

DATABASE = 'db/expenses.db'

def get_db():
    conn = sqlite3.connect(DATABASE)
    return conn

def init_db():
    with get_db() as conn:
        conn.execute('''CREATE TABLE IF NOT EXISTS expenses (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            amount REAL NOT NULL,
                            type TEXT NOT NULL,
                            date TEXT NOT NULL,
                            description TEXT
                        )''')
        conn.execute('''CREATE TABLE IF NOT EXISTS balance (
                            id INTEGER PRIMARY KEY,
                            total_balance REAL NOT NULL
                        )''')
        conn.execute('''INSERT OR IGNORE INTO balance (id, total_balance) VALUES (1, 0)''')
        conn.commit()

@app.route('/add_expense', methods=['POST'])
def add_expense():
    data = request.get_json()
    amount = data['amount']
    exp_type = data['type']
    date = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    description = data.get('description', '')

    with get_db() as conn:
        conn.execute('INSERT INTO expenses (amount, type, date, description) VALUES (?, ?, ?, ?)', (amount, exp_type, date, description))
        if exp_type == 'debit':
            conn.execute('UPDATE balance SET total_balance = total_balance - ? WHERE id = 1', (amount,))
        elif exp_type == 'credit':
            conn.execute('UPDATE balance SET total_balance = total_balance + ? WHERE id = 1', (amount,))
        conn.commit()

    return jsonify({'message': 'Expense added successfully'}), 201

@app.route('/delete_expense', methods=['DELETE'])
def delete_expense():
    data = request.get_json()
    expense_id = data['id']

    with get_db() as conn:
        expense = conn.execute('SELECT amount, type FROM expenses WHERE id = ?', (expense_id,)).fetchone()
        if expense:
            amount, exp_type = expense
            conn.execute('DELETE FROM expenses WHERE id = ?', (expense_id,))
            if exp_type == 'debit':
                conn.execute('UPDATE balance SET total_balance = total_balance + ? WHERE id = 1', (amount,))
            elif exp_type == 'credit':
                conn.execute('UPDATE balance SET total_balance = total_balance - ? WHERE id = 1', (amount,))
            conn.commit()
            return jsonify({'message': 'Expense deleted successfully'}), 200
        else:
            return jsonify({'message': 'Expense not found'}), 404

@app.route('/current_balance', methods=['GET'])
def current_balance():
    with get_db() as conn:
        balance = conn.execute('SELECT total_balance FROM balance WHERE id = 1').fetchone()[0]
    return jsonify({'current_balance': balance}), 200

@app.route('/monthly_summary', methods=['GET'])
def monthly_summary():
    current_month = datetime.now().strftime('%Y-%m')
    with get_db() as conn:
        income = conn.execute('SELECT SUM(amount) FROM expenses WHERE type = "credit" AND date LIKE ?', (f'{current_month}%',)).fetchone()[0] or 0
        expenditure = conn.execute('SELECT SUM(amount) FROM expenses WHERE type = "debit" AND date LIKE ?', (f'{current_month}%',)).fetchone()[0] or 0
    return jsonify({'income': income, 'expenditure': expenditure}), 200

@app.route('/transactions', methods=['POST'])
def transactions():
    data = request.get_json()
    start_date = data.get('start_date')
    end_date = data.get('end_date')

    # Validate dates
    try:
        start_date_obj = datetime.strptime(start_date, '%Y-%m-%d')
        end_date_obj = datetime.strptime(end_date, '%Y-%m-%d')
    except ValueError:
        return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD.'}), 400

    if start_date_obj > end_date_obj:
        return jsonify({'error': 'start_date cannot be greater than end_date.'}), 400

    with get_db() as conn:
        transactions = conn.execute('SELECT * FROM expenses WHERE date(date) BETWEEN ? AND ?', (start_date, end_date)).fetchall()
        transactions_list = [{'id': row[0], 'amount': row[1], 'type': row[2], 'date': row[3], 'description': row[4]} for row in transactions]

    return jsonify({'transactions': transactions_list}), 200

if __name__ == '__main__':
    init_db()
    CORS(app)  # Add this line to enable CORS for all APIs
    app.run(debug=True)