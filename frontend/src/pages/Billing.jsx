import { useState } from 'react';
import { FiDollarSign, FiFileText, FiLayout } from 'react-icons/fi';
import HeaderBar from '../components/HeaderBar';
import Tabs from '../components/Tabs';
import Payments from './Payments';
import Receipts from './Receipts';
import ReceiptTemplates from './ReceiptTemplates';

export default function Billing() {
  const [activeTab, setActiveTab] = useState('payments');

  const tabs = [
    { id: 'payments', label: 'Payments', icon: <FiDollarSign /> },
    { id: 'receipts', label: 'Receipts', icon: <FiFileText /> },
    { id: 'templates', label: 'Templates', icon: <FiLayout /> }
  ];

  return (
    <div className="space-y-6">
      <HeaderBar title="Billing" />

      <div className="bg-white border rounded shadow-sm p-6">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        {activeTab === 'payments' && (
          <div>
            <Payments />
          </div>
        )}

        {activeTab === 'receipts' && (
          <div>
            <Receipts />
          </div>
        )}

        {activeTab === 'templates' && (
          <div>
            <ReceiptTemplates />
          </div>
        )}
      </div>
    </div>
  );
}
