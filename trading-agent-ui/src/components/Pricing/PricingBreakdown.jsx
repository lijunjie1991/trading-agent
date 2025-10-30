import { Card, Tooltip, Typography, Space, Divider } from 'antd'
import { InfoCircleOutlined, CalculatorOutlined } from '@ant-design/icons'
import './PricingBreakdown.css'

const { Text } = Typography

/**
 * PricingBreakdown Component
 *
 * Displays detailed pricing calculation breakdown with excellent UX.
 * Shows base price, multipliers, and final amount in an easy-to-understand format.
 *
 * @param {Object} props
 * @param {Object} props.pricing - Pricing data from quote or pricingBreakdown
 * @param {number} props.pricing.basePrice - Base price before multipliers
 * @param {number} props.pricing.researchDepthFactor - Research depth multiplier (e.g., 1.5)
 * @param {number} props.pricing.analystFactor - Analyst count multiplier (e.g., 1.2)
 * @param {number} props.pricing.totalAmount - Final calculated amount
 * @param {string} props.pricing.currency - Currency code (e.g., 'USD')
 * @param {string} props.pricing.calculationFormula - Human-readable formula
 * @param {number} props.researchDepth - Research depth value
 * @param {number} props.analystCount - Number of analysts
 * @param {boolean} props.compact - Use compact layout (default: false)
 * @param {boolean} props.showFormula - Show calculation formula (default: true)
 */
const PricingBreakdown = ({
  pricing,
  researchDepth,
  analystCount,
  compact = false,
  showFormula = true,
}) => {
  if (!pricing) return null

  const {
    basePrice,
    researchDepthFactor,
    analystFactor,
    totalAmount,
    currency = 'USD',
    calculationFormula,
  } = pricing

  // Calculate the percentage increase from multipliers
  const depthIncrease = researchDepthFactor ? ((researchDepthFactor - 1) * 100).toFixed(0) : 0
  const analystIncrease = analystFactor ? ((analystFactor - 1) * 100).toFixed(0) : 0

  const formatAmount = (amount) => {
    const num = Number(amount)
    return Number.isFinite(num) ? num.toFixed(2) : '0.00'
  }

  if (compact) {
    return (
      <div className="pricing-breakdown-compact">
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          <div className="pricing-breakdown-compact__header">
            <CalculatorOutlined className="pricing-breakdown-compact__icon" />
            <Text strong>Pricing Breakdown</Text>
          </div>
          <div className="pricing-breakdown-compact__items">
            <div className="pricing-breakdown-compact__item">
              <Text type="secondary">Base Price:</Text>
              <Text strong>{currency} {formatAmount(basePrice)}</Text>
            </div>
            {researchDepthFactor && researchDepthFactor !== 1 && (
              <div className="pricing-breakdown-compact__item">
                <Text type="secondary">Depth Factor:</Text>
                <Text>×{researchDepthFactor} (+{depthIncrease}%)</Text>
              </div>
            )}
            {analystFactor && analystFactor !== 1 && (
              <div className="pricing-breakdown-compact__item">
                <Text type="secondary">Analyst Factor:</Text>
                <Text>×{analystFactor} (+{analystIncrease}%)</Text>
              </div>
            )}
          </div>
          <Divider style={{ margin: '8px 0' }} />
          <div className="pricing-breakdown-compact__total">
            <Text strong>Total:</Text>
            <Text strong style={{ fontSize: '16px', color: '#1890ff' }}>
              {currency} {formatAmount(totalAmount)}
            </Text>
          </div>
        </Space>
      </div>
    )
  }

  return (
    <Card className="pricing-breakdown" bordered={false}>
      <div className="pricing-breakdown__header">
        <Space size={8}>
          <CalculatorOutlined className="pricing-breakdown__icon" />
          <Text strong className="pricing-breakdown__title">
            Pricing Breakdown
          </Text>
        </Space>
        <Tooltip title="This shows how your final price is calculated based on your selections">
          <InfoCircleOutlined className="pricing-breakdown__info-icon" />
        </Tooltip>
      </div>

      <div className="pricing-breakdown__content">
        {/* Base Price */}
        <div className="pricing-breakdown__row pricing-breakdown__row--base">
          <div className="pricing-breakdown__label">
            <Text>Base Price</Text>
            <Tooltip title="Starting price for any analysis task">
              <InfoCircleOutlined className="pricing-breakdown__tooltip-icon" />
            </Tooltip>
          </div>
          <div className="pricing-breakdown__value">
            <Text strong>{currency} {formatAmount(basePrice)}</Text>
          </div>
        </div>

        {/* Research Depth Factor */}
        {researchDepthFactor && researchDepthFactor !== 1 && (
          <div className="pricing-breakdown__row">
            <div className="pricing-breakdown__label">
              <Text>Research Depth</Text>
              <Tooltip title={`Level ${researchDepth || 1} provides ${depthIncrease}% more thorough analysis`}>
                <InfoCircleOutlined className="pricing-breakdown__tooltip-icon" />
              </Tooltip>
            </div>
            <div className="pricing-breakdown__value">
              <Space size={4}>
                <Text>×{researchDepthFactor}</Text>
                <Text type="secondary" className="pricing-breakdown__percentage">
                  (+{depthIncrease}%)
                </Text>
              </Space>
            </div>
          </div>
        )}

        {/* Analyst Factor */}
        {analystFactor && analystFactor !== 1 && (
          <div className="pricing-breakdown__row">
            <div className="pricing-breakdown__label">
              <Text>Analyst Team</Text>
              <Tooltip title={`${analystCount || 1} analyst${(analystCount || 1) > 1 ? 's' : ''} working in parallel adds ${analystIncrease}% more coverage`}>
                <InfoCircleOutlined className="pricing-breakdown__tooltip-icon" />
              </Tooltip>
            </div>
            <div className="pricing-breakdown__value">
              <Space size={4}>
                <Text>×{analystFactor}</Text>
                <Text type="secondary" className="pricing-breakdown__percentage">
                  (+{analystIncrease}%)
                </Text>
              </Space>
            </div>
          </div>
        )}

        <Divider className="pricing-breakdown__divider" />

        {/* Total Amount */}
        <div className="pricing-breakdown__row pricing-breakdown__row--total">
          <div className="pricing-breakdown__label">
            <Text strong>Total Price</Text>
          </div>
          <div className="pricing-breakdown__value pricing-breakdown__value--total">
            <Text strong className="pricing-breakdown__total-amount">
              {currency} {formatAmount(totalAmount)}
            </Text>
          </div>
        </div>

        {/* Formula Display */}
        {showFormula && calculationFormula && (
          <div className="pricing-breakdown__formula">
            <Text type="secondary" className="pricing-breakdown__formula-text">
              {calculationFormula}
            </Text>
          </div>
        )}
      </div>
    </Card>
  )
}

export default PricingBreakdown
