import { Card, Typography, Space, Tag, Tooltip, Spin, Alert, Popover } from 'antd'
import {
  DollarOutlined,
  GiftOutlined,
  InfoCircleOutlined,
  ThunderboltOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons'
import PricingBreakdown from './PricingBreakdown'
import './PricingCalculator.css'

const { Text, Title } = Typography

/**
 * PricingCalculator Component
 *
 * A comprehensive pricing display for the task creation page.
 * Shows pricing preview, free quota status, and detailed breakdown.
 *
 * @param {Object} props
 * @param {Object} props.quote - Quote data from API
 * @param {boolean} props.quoteLoading - Loading state
 * @param {Object} props.billingSummary - User's billing summary
 * @param {boolean} props.billingLoading - Billing loading state
 */
const PricingCalculator = ({ quote, quoteLoading, billingSummary, billingLoading }) => {
  const isFree = Boolean(quote?.eligibleForFreeQuota)
  const totalAmount = quote?.totalAmount
  const currency = quote?.currency || billingSummary?.currency || 'USD'
  const freeQuotaRemaining = quote?.freeQuotaRemaining ?? billingSummary?.freeQuotaRemaining ?? 0
  const freeQuotaTotal = quote?.freeQuotaTotal ?? billingSummary?.freeQuotaTotal ?? 0

  const formatAmount = (amount) => {
    const num = Number(amount)
    return Number.isFinite(num) ? num.toFixed(2) : '0.00'
  }

  const renderDetailedBreakdown = () => {
    if (!quote || !quote.basePrice) return null

    return (
      <div style={{
        maxWidth: 320,
        padding: '16px',
        background: 'rgba(17, 24, 39, 0.95)',
        backdropFilter: 'blur(12px)',
        borderRadius: 12,
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
      }}>
        <div style={{ marginBottom: 14 }}>
          <Text strong style={{ fontSize: 14, color: '#f9fafb', letterSpacing: '-0.01em' }}>
            💰 Pricing Breakdown
          </Text>
        </div>
        <Space direction="vertical" size={10} style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.6)' }}>Base Price</Text>
            <Text strong style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.9)' }}>
              {currency} {formatAmount(quote.basePrice)}
            </Text>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.6)' }}>Depth Factor</Text>
            <Text strong style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.9)' }}>
              ×{quote.researchDepthFactor || 1}
            </Text>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.6)' }}>Analyst Factor</Text>
            <Text strong style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.9)' }}>
              ×{quote.analystFactor || 1}
            </Text>
          </div>
          <div style={{
            height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)',
            margin: '4px 0'
          }} />
          <div>
            <Text style={{
              fontSize: 11,
              color: 'rgba(255, 255, 255, 0.5)',
              display: 'block',
              marginBottom: 6,
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Calculation
            </Text>
            <div style={{
              fontSize: 11,
              color: '#a5b4fc',
              fontFamily: 'SF Mono, Monaco, Courier New, monospace',
              background: 'rgba(99, 102, 241, 0.15)',
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid rgba(99, 102, 241, 0.2)',
              lineHeight: 1.5
            }}>
              {quote.calculationFormula ||
                `${currency} ${formatAmount(quote.basePrice)} × ${quote.researchDepthFactor} × ${quote.analystFactor}`}
            </div>
          </div>
          <div style={{
            height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
            margin: '4px 0'
          }} />
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 0 4px'
          }}>
            <Text strong style={{ fontSize: 13, color: '#f9fafb' }}>Total Amount</Text>
            <Text strong style={{
              fontSize: 16,
              color: '#a5b4fc',
              letterSpacing: '-0.02em',
              textShadow: '0 0 20px rgba(165, 180, 252, 0.3)'
            }}>
              {currency} {formatAmount(totalAmount)}
            </Text>
          </div>
        </Space>
      </div>
    )
  }

  // Loading State
  if (quoteLoading || billingLoading) {
    return (
      <div className="pricing-calculator-compact pricing-calculator-compact--loading">
        <Spin />
        <Text type="secondary" style={{ fontSize: 13 }}>Calculating...</Text>
      </div>
    )
  }

  // No Quote Available
  if (!quote) {
    return (
      <div className="pricing-calculator-compact pricing-calculator-compact--placeholder">
        <DollarOutlined style={{ fontSize: 20, color: '#9ca3af' }} />
        <Text type="secondary" style={{ fontSize: 13 }}>
          Select options to see pricing
        </Text>
      </div>
    )
  }

  return (
    <div className={`pricing-calculator-compact ${
      isFree ? 'pricing-calculator-compact--free' : 'pricing-calculator-compact--paid'
    }`}>
      <div className="pricing-calculator-compact__main">
        <div className="pricing-calculator-compact__icon">
          {isFree ? <GiftOutlined /> : <DollarOutlined />}
        </div>
        <div className="pricing-calculator-compact__content">
          <div className="pricing-calculator-compact__label">
            {isFree ? 'Free Analysis' : 'Estimated Cost'}
          </div>
          {isFree ? (
            <div className="pricing-calculator-compact__free-text">
              FREE <span style={{ fontSize: 12, opacity: 0.7 }}>• Using 1 credit</span>
              {freeQuotaTotal > 0 && (
                <span style={{ fontSize: 12, opacity: 0.7, marginLeft: 8 }}>
                  ({freeQuotaRemaining}/{freeQuotaTotal} remaining)
                </span>
              )}
            </div>
          ) : (
            <div className="pricing-calculator-compact__price">
              {currency} {formatAmount(totalAmount)}
            </div>
          )}
        </div>
        {!isFree && quote.basePrice && (
          <Popover
            content={renderDetailedBreakdown()}
            title={null}
            trigger="click"
            placement="bottomRight"
            overlayInnerStyle={{
              padding: 0,
              background: 'transparent',
              boxShadow: 'none'
            }}
          >
            <div className="pricing-calculator-compact__info-btn">
              <QuestionCircleOutlined />
            </div>
          </Popover>
        )}
      </div>
    </div>
  )
}

export default PricingCalculator
