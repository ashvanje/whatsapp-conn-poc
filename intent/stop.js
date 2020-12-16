
const apiHandler = require('../apiHandler')
const db = require('../citybusHelper')
const dialogflow = require('../dialogflow')
const intentHandler = require('../intentHandler')

async function handleResponse(response, sessionId) {
  let dialogFlowFulfillmentMessage = `${response.dialogFlowFulfillmentMessage}`
  let returnMessage = ''
  let outputContexts = response.outputContexts
  let intent = `${response.intent}`
    console.log(`askStop`)
    if (dialogFlowFulfillmentMessage.includes("biz")) {
      console.log(`response.parameters: ${JSON.stringify(response.parameters)}`)
      let param
      console.log(`dialogFlowFulfillmentMessage = ${JSON.stringify(dialogFlowFulfillmentMessage)}`)
      console.log(`outputContexts = ${JSON.stringify(outputContexts)}`)

      outputContexts.forEach((outputContext) => {
        console.log(`outputContext = ${JSON.stringify(outputContext)}`)
        let outputContextName = `${outputContext.name}`
        console.log(`outputContextName = ${JSON.stringify(outputContextName)}`)
        if (outputContextName.includes('testfollowupintent-followup')) {
          param = outputContext
          console.log(`param = ${JSON.stringify(param)}`)

        }
      });
      // console.log(`param2 = ${JSON.stringify(param)}`)
      // let params = outputContexts
      let eta = await apiHandler.getEta(response.parameters)
      
      returnMessage = eta
      console.log(`askStop 1`)
      // returnMessage= await handleIntent('askStop', sessionId)
    } else {
      console.log(`askStop 2`)
      console.log(`response.parameters: ${JSON.stringify(response.parameters)}`)
      let stops = await apiHandler.mtrStops(response.parameters)
      // console.log(`stops: ${JSON.stringify(stops.data)}`)
      returnMessage =  
`
${dialogFlowFulfillmentMessage}
${stops}
`    
    }

  return returnMessage
}

module.exports = {
    handleResponse
}