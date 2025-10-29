import { Divider, Typography, Tooltip, Tag } from 'antd'
import { InfoCircleOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { calculatePricingBreakdown, formatPrice } from '../../utils/pricingCalculator'
import './PricingBreakdown.css'

const { Text, Title } = Typography

/**
 * PricingBreakdown 组件
 * 显示详细的费用明细和计算逻辑
 *
 * @param {Object} props
 * @param {number} props.researchDepth - 研究深度 (1-5)
 * @param {string[]} props.selectedAnalysts - 选择的分析师列表
 * @param {number} props.freeQuotaRemaining - 剩余免费额度
 * @param {number} props.actualAmount - 后端返回的实际金额（用于对比）
 * @param {string} props.currency - 货币代码
 * @param {boolean} props.compact - 是否使用紧凑模式
 * @param {boolean} props.showExplanation - 是否显示说明文字
 */
const PricingBreakdown = ({
  researchDepth,
  selectedAnalysts = [],
  freeQuotaRemaining = 0,
  actualAmount = null,
  currency = 'USD',
  compact = false,
  showExplanation = true,
}) => {
  // 计算费用明细
  const breakdown = calculatePricingBreakdown(
    researchDepth,
    selectedAnalysts,
    freeQuotaRemaining
  )

  if (!breakdown) {
    return (
      <div className="pricing-breakdown">
        <Text type="secondary">Select depth and analysts to see pricing</Text>
      </div>
    )
  }

  // 紧凑模式：只显示关键信息
  if (compact) {
    return (
      <div className="pricing-breakdown pricing-breakdown--compact">
        <div className="pricing-breakdown__compact-summary">
          <div className="pricing-breakdown__compact-label">
            <Text type="secondary">Estimated Cost</Text>
            <Tooltip title="Detailed breakdown available in payment modal">
              <InfoCircleOutlined style={{ fontSize: 12, color: '#9ca3af', marginLeft: 4 }} />
            </Tooltip>
          </div>
          <div className="pricing-breakdown__compact-amount">
            {breakdown.isFree ? (
              <Tag color="green" style={{ margin: 0, fontSize: 14, padding: '4px 12px' }}>
                FREE
              </Tag>
            ) : (
              <Text strong style={{ fontSize: 18 }}>
                {formatPrice(breakdown.total, currency)}
              </Text>
            )}
          </div>
        </div>
      </div>
    )
  }

  // 完整模式：显示详细明细
  return (
    <div className="pricing-breakdown">
      {showExplanation && (
        <div className="pricing-breakdown__header">
          <Title level={5} style={{ margin: 0 }}>
            Pricing Breakdown
          </Title>
          <Text type="secondary" style={{ fontSize: 12, marginTop: 4 }}>
            How we calculate your analysis cost
          </Text>
        </div>
      )}

      <div className="pricing-breakdown__items">
        {breakdown.items.map((item, index) => (
          <div
            key={index}
            className={`pricing-breakdown__item ${
              item.type === 'discount' || item.type === 'free_credit'
                ? 'pricing-breakdown__item--discount'
                : ''
            }`}
          >
            <div className="pricing-breakdown__item-info">
              <div className="pricing-breakdown__item-label">
                {item.type === 'free_credit' && (
                  <CheckCircleOutlined style={{ color: '#10b981', marginRight: 6 }} />
                )}
                {item.label}
                {item.type === 'discount' && (
                  <Tag
                    color="green"
                    style={{
                      marginLeft: 8,
                      fontSize: 10,
                      padding: '0 6px',
                      lineHeight: '18px',
                    }}
                  >
                    DISCOUNT
                  </Tag>
                )}
              </div>
              {item.description && (
                <div className="pricing-breakdown__item-description">
                  {item.description}
                </div>
              )}
            </div>
            <div className="pricing-breakdown__item-price">
              <Text
                strong={item.type === 'depth' || item.type === 'free_credit'}
                style={{
                  color:
                    item.type === 'discount' || item.type === 'free_credit'
                      ? '#10b981'
                      : item.type === 'depth'
                      ? '#111827'
                      : '#6b7280',
                }}
              >
                {item.price >= 0 ? '+' : ''}
                {formatPrice(Math.abs(item.price), currency)}
              </Text>
            </div>
          </div>
        ))}
      </div>

      <Divider style={{ margin: '16px 0' }} />

      {/* 小计 */}
      {breakdown.discount > 0 && (
        <div className="pricing-breakdown__subtotal">
          <Text type="secondary">Subtotal</Text>
          <Text type="secondary">{formatPrice(breakdown.subtotal, currency)}</Text>
        </div>
      )}

      {/* 折扣 */}
      {breakdown.discount > 0 && (
        <div className="pricing-breakdown__subtotal">
          <Text style={{ color: '#10b981' }}>Discount</Text>
          <Text style={{ color: '#10b981' }}>
            -{formatPrice(breakdown.discount, currency)}
          </Text>
        </div>
      )}

      {/* 总计 */}
      <div className="pricing-breakdown__total">
        <Text strong style={{ fontSize: 16 }}>
          {breakdown.isFree ? 'Total (Free)' : 'Total'}
        </Text>
        <div className="pricing-breakdown__total-amount">
          {breakdown.isFree ? (
            <Tag
              color="green"
              style={{
                margin: 0,
                fontSize: 16,
                padding: '6px 16px',
                fontWeight: 600,
              }}
            >
              FREE
            </Tag>
          ) : (
            <Text strong style={{ fontSize: 20, color: '#111827' }}>
              {formatPrice(breakdown.total, currency)}
            </Text>
          )}
        </div>
      </div>

      {/* 实际金额对比（如果有后端返回的金额） */}
      {actualAmount !== null && actualAmount !== breakdown.total && !breakdown.isFree && (
        <div className="pricing-breakdown__note">
          <InfoCircleOutlined style={{ marginRight: 6, fontSize: 12 }} />
          <Text type="secondary" style={{ fontSize: 11 }}>
            Actual charge may vary. Final amount: {formatPrice(actualAmount, currency)}
          </Text>
        </div>
      )}

      {/* 免费额度提示 */}
      {breakdown.isFree && freeQuotaRemaining > 1 && (
        <div className="pricing-breakdown__note pricing-breakdown__note--success">
          <CheckCircleOutlined style={{ marginRight: 6, color: '#10b981' }} />
          <Text style={{ fontSize: 12, color: '#059669' }}>
            {freeQuotaRemaining - 1} free analysis remaining after this one
          </Text>
        </div>
      )}
    </div>
  )
}

export default PricingBreakdown
