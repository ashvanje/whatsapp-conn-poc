
const apiHandler = require('../apiHandler')
const db = require('../db')
const dialogflow = require('../dialogflow')
const intentHandler = require('../intentHandler')

async function handleResponse(response, sessionId) {
  let dialogFlowFulfillmentMessage = `${response.dialogFlowFulfillmentMessage}`
  let returnMessage = ''
  let outputContexts = response.outputContexts
  let intent = `${response.intent}`
    console.log(`direction`)
    if (dialogFlowFulfillmentMessage.includes("biz")) {
      console.log(`response.parameters: ${JSON.stringify(response.parameters)}`)
      console.log(`direction 1`)
      returnMessage = await intentHandler.handleIntent('bizRuleStop', sessionId)
    } else {
      console.log(`direction 2`)
      console.log(`response.parameters: ${JSON.stringify(response.parameters)}`)
      let direction = await apiHandler.inoutboundstops(response.parameters)
      // console.log(`direction: ${JSON.stringify(direction.data)}`)
      returnMessage = 
`${dialogFlowFulfillmentMessage}
${direction}`
    }

  return returnMessage
}

module.exports = {
    handleResponse
}