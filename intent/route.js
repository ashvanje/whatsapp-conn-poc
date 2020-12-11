
const apiHandler = require('../apiHandler')
const db = require('../db')
const dialogflow = require('../dialogflow')
const intentHandler = require('../intentHandler')

async function handleResponse(response, sessionId) {
  let dialogFlowFulfillmentMessage = `${response.dialogFlowFulfillmentMessage}`
  let returnMessage = ''
  let outputContexts = response.outputContexts
  let intent = `${response.intent}`
    console.log(`route`)
    if (dialogFlowFulfillmentMessage.includes("biz")) {
      console.log(`response.parameters: ${JSON.stringify(response.parameters)}`)
      console.log(`route 1`)
      returnMessage = await intentHandler.handleIntent('bizRuleDirection', sessionId)
    } else {
      console.log(`route 2`)
      console.log(`response.parameters: ${JSON.stringify(response.parameters)}`)
      let routes = await apiHandler.getRoutes(response.parameters)
      // console.log(`routes: ${JSON.stringify(routes.data)}`)
      returnMessage = 
`${dialogFlowFulfillmentMessage}
${routes}`
    }
  return returnMessage
}

module.exports = {
    handleResponse
}