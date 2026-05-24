import { RunLog, RunType } from '@/types'

export interface SurvivalStatus {
  isExempted: boolean
  isSurvived: boolean
  totalDays: number
  regularDays: number
  personalDays: number
  conditionAMet: boolean
  conditionBMet: boolean
  remainingRegularNeeded: number
  remainingTotalNeeded: number
  remainingPersonalNeeded: number
  minRunsNeeded: number
  message: string
}

/**
 * 1일 1회 카운트 및 벙(REGULAR) 우선순위 적용하여 날짜별 대표 RunType 맵을 생성합니다.
 */
export function getDailyRunMap(logs: RunLog[]): Map<string, RunType> {
  const dailyMap = new Map<string, RunType>()

  logs.forEach((log) => {
    // run_date가 YYYY-MM-DD 형식이라고 가정
    const dateStr = log.run_date
    const existing = dailyMap.get(dateStr)

    if (!existing) {
      dailyMap.set(dateStr, log.run_type)
    } else if (existing === 'PERSONAL' && log.run_type === 'REGULAR') {
      // 벙(REGULAR) 우선순위 적용
      dailyMap.set(dateStr, 'REGULAR')
    }
  })

  return dailyMap
}

/**
 * 월간 러닝 로그와 회원 상태를 기반으로 생존 여부 및 남은 횟수를 계산합니다.
 */
export function calculateSurvival(
  logs: RunLog[],
  isExempted: boolean
): SurvivalStatus {
  if (isExempted) {
    return {
      isExempted: true,
      isSurvived: true,
      totalDays: 0,
      regularDays: 0,
      personalDays: 0,
      conditionAMet: true,
      conditionBMet: true,
      remainingRegularNeeded: 0,
      remainingTotalNeeded: 0,
      remainingPersonalNeeded: 0,
      minRunsNeeded: 0,
      message: '이번 달 활동이 면제되었습니다. (부상, 출장 등)',
    }
  }

  const dailyMap = getDailyRunMap(logs)
  
  let regularDays = 0
  let personalDays = 0

  dailyMap.forEach((runType) => {
    if (runType === 'REGULAR') {
      regularDays++
    } else {
      personalDays++
    }
  })

  const totalDays = regularDays + personalDays

  // [Rule 3] 생존 조건
  // 조건 A: 총 인증 일수 >= 2 && 정규(REGULAR) 인증 일수 >= 1
  const conditionAMet = totalDays >= 2 && regularDays >= 1

  // 조건 B: 개인런(PERSONAL) 인증 일수 >= 6
  // Note: 벙 참석이 없는 경우이지만, 벙이 있더라도 개인런만으로 6회 이상 채우면 
  // 조건 B의 수식 자체는 'PERSONAL 일수 >= 6' 혹은 '벙 없이 개인런만 6회'로 볼 수 있습니다.
  // PRD: "(벙 참석 없이) 월 총 PERSONAL 인증 일수 >= 6"
  // 벙 참석이 있으면 조건 A를 노리는 것이 훨씬 쉬우나, 규정상 벙이 있든 없든 개인런이 6회 이상이어도 생존으로 판단하는 것이 타당합니다.
  const conditionBMet = personalDays >= 6

  const isSurvived = conditionAMet || conditionBMet

  // 남은 횟수 계산
  // 조건 A를 만족하기 위해 필요한 것:
  // - 벙 1회 필수 (남은 벙 횟수 = max(0, 1 - regularDays))
  // - 총 2회 필수 (남은 총 횟수 = max(0, 2 - totalDays))
  const remainingRegularNeeded = Math.max(0, 1 - regularDays)
  const remainingTotalNeeded = Math.max(0, 2 - totalDays)

  // 조건 B를 만족하기 위해 필요한 것:
  // - 개인런 6회 필수 (남은 개인런 횟수 = max(0, 6 - personalDays))
  const remainingPersonalNeeded = Math.max(0, 6 - personalDays)

  // 최단 생존을 위해 필요한 런 횟수
  let minRunsNeeded = 0
  let message = ''

  if (isSurvived) {
    minRunsNeeded = 0
    message = '🎉 이번 달 생존 성공! 고생하셨습니다.'
  } else {
    // 조건 A를 충족하기 위해 추가로 필요한 횟수
    // 벙이 0회인 경우: 최소 벙 1회 + 필요한 경우 추가 1회
    // 벙이 1회 이상인 경우: 총 횟수가 2회 미만이면 추가 1회
    const runsNeededForA = remainingRegularNeeded + Math.max(0, remainingTotalNeeded - remainingRegularNeeded)

    // 조건 B를 충족하기 위해 추가로 필요한 횟수
    const runsNeededForB = remainingPersonalNeeded

    minRunsNeeded = Math.min(runsNeededForA, runsNeededForB)

    if (runsNeededForA <= runsNeededForB) {
      if (remainingRegularNeeded > 0) {
        message = `벙(정규런) 1회를 포함해 총 ${runsNeededForA}회 더 뛰면 생존합니다!`
      } else {
        message = `아무 러닝이나 ${runsNeededForA}회 더 뛰면 생존합니다!`
      }
    } else {
      message = `개인런을 ${runsNeededForB}회 더 뛰면 생존합니다!`
    }
  }

  return {
    isExempted: false,
    isSurvived,
    totalDays,
    regularDays,
    personalDays,
    conditionAMet,
    conditionBMet,
    remainingRegularNeeded,
    remainingTotalNeeded,
    remainingPersonalNeeded,
    minRunsNeeded,
    message,
  }
}
