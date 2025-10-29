/**
 * Pricing Calculator
 * 前端价格计算器 - 使用后端返回的定价规则计算费用明细
 *
 * 定价公式（来自后端 PricingService）:
 * totalAmount = basePrice × (1 + depthMultiplier × (depth - 1)) × (1 + analystMultiplier × (analystCount - 1))
 */

import { RESEARCH_DEPTH_OPTIONS } from './constants'

// 分析师名称映射
export const ANALYST_NAMES = {
  market: 'Market Analyst',
  social: 'Social Analyst',
  news: 'News Analyst',
  fundamentals: 'Fundamentals Analyst',
}

/**
 * 计算费用明细（使用后端定价规则）
 * @param {Object} pricingRules - 后端返回的定价规则
 * @param {number} pricingRules.basePrice - 基础价格
 * @param {number} pricingRules.researchDepthMultiplier - 研究深度乘数
 * @param {number} pricingRules.analystMultiplier - 分析师乘数
 * @param {string} pricingRules.currency - 货币代码
 * @param {number} researchDepth - 研究深度 (1-5)
 * @param {string[]} selectedAnalysts - 选择的分析师列表
 * @param {number} freeQuotaRemaining - 剩余免费额度
 * @returns {Object} 费用明细对象
 */
export function calculatePricingBreakdown(pricingRules, researchDepth, selectedAnalysts = [], freeQuotaRemaining = 0) {
  // 输入验证
  if (!pricingRules || !researchDepth) {
    return null
  }

  const {
    basePrice,
    researchDepthMultiplier,
    analystMultiplier,
    currency = 'USD',
  } = pricingRules

  const analystCount = selectedAnalysts ? selectedAnalysts.length : 0
  const depth = Math.max(researchDepth || 1, 1)

  const breakdown = {
    items: [],
    basePrice: Number(basePrice),
    depthFactor: 0,
    analystFactor: 0,
    subtotal: 0,
    total: 0,
    isFree: false,
    currency,
    formula: {},
  }

  // 1. 基础价格
  const depthOption = RESEARCH_DEPTH_OPTIONS.find(opt => opt.value === depth)
  breakdown.items.push({
    type: 'base',
    label: 'Base Price',
    description: depthOption ? `Starting price for ${depthOption.label.toLowerCase()} analysis` : 'Starting price',
    price: Number(basePrice),
    quantity: 1,
  })

  // 2. 计算研究深度因子
  // depthFactor = 1 + depthMultiplier × (depth - 1)
  const depthMultiplier = Number(researchDepthMultiplier)
  breakdown.depthFactor = 1 + depthMultiplier * Math.max(depth - 1, 0)

  if (depth > 1) {
    const depthIncrease = Number(basePrice) * (breakdown.depthFactor - 1)
    breakdown.items.push({
      type: 'depth_multiplier',
      label: `Research Depth: ${depthOption?.label || `Level ${depth}`}`,
      description: `+${(depthMultiplier * 100).toFixed(0)}% per level above basic (${depth - 1} level${depth > 2 ? 's' : ''})`,
      price: depthIncrease,
      quantity: 1,
      formula: `${basePrice} × ${depthMultiplier} × ${depth - 1}`,
    })
  }

  // 3. 计算分析师因子
  // analystFactor = 1 + analystMultiplier × (analystCount - 1)
  const analystMult = Number(analystMultiplier)
  breakdown.analystFactor = 1 + analystMult * Math.max(analystCount - 1, 0)

  if (analystCount > 1) {
    const baseWithDepth = Number(basePrice) * breakdown.depthFactor
    const analystIncrease = baseWithDepth * (breakdown.analystFactor - 1)

    breakdown.items.push({
      type: 'analyst_multiplier',
      label: `Additional Analysts (${analystCount - 1})`,
      description: `+${(analystMult * 100).toFixed(0)}% per analyst beyond the first`,
      price: analystIncrease,
      quantity: 1,
      formula: `${baseWithDepth.toFixed(2)} × ${analystMult} × ${analystCount - 1}`,
      analysts: selectedAnalysts.slice(1).map(id => ANALYST_NAMES[id] || id),
    })
  }

  // 4. 计算总价
  // total = basePrice × depthFactor × analystFactor
  breakdown.subtotal = Number(basePrice) * breakdown.depthFactor * breakdown.analystFactor
  breakdown.total = breakdown.subtotal

  // 保存计算公式
  breakdown.formula = {
    base: Number(basePrice),
    depthFactor: breakdown.depthFactor.toFixed(2),
    analystFactor: breakdown.analystFactor.toFixed(2),
    calculation: `${basePrice} × ${breakdown.depthFactor.toFixed(2)} × ${breakdown.analystFactor.toFixed(2)} = ${breakdown.total.toFixed(2)}`,
  }

  // 5. 免费额度
  if (freeQuotaRemaining > 0) {
    breakdown.isFree = true
    breakdown.items.push({
      type: 'free_credit',
      label: 'Free Credit Applied',
      description: `You have ${freeQuotaRemaining} free analysis credit${freeQuotaRemaining > 1 ? 's' : ''} remaining`,
      price: -breakdown.total,
      quantity: 1,
    })
    breakdown.total = 0
  }

  return breakdown
}

/**
 * 格式化价格显示
 * @param {number} amount - 金额
 * @param {string} currency - 货币代码
 * @returns {string} 格式化后的价格字符串
 */
export function formatPrice(amount, currency = 'USD') {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return ''
  }
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return formatter.format(amount)
}

/**
 * 获取价格说明文本
 * @param {number} researchDepth - 研究深度
 * @param {number} analystCount - 分析师数量
 * @returns {string} 说明文本
 */
export function getPricingExplanation(researchDepth, analystCount) {
  const depthConfig = DEPTH_PRICING[researchDepth]
  if (!depthConfig) return ''

  let explanation = `${depthConfig.label} depth analysis`

  if (analystCount > 0) {
    explanation += ` with ${analystCount} specialist${analystCount > 1 ? 's' : ''}`
  }

  if (analystCount >= 3) {
    explanation += ' (10% multi-analyst discount applied)'
  }

  return explanation
}
