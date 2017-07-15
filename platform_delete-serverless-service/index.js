'use strict';
const request = require('request');
const errorHandlerModule = require("./components/error-handler.js");
const responseObj = require("./components/response.js");
const configObj = require("./components/config.js");
const logger = require("./components/logger.js");
const secretHandlerModule = require("./components/secret-handler.js");
const formats = require('./jenkins-json.js');
const Guid = require('guid');
var payloads = formats('apis');

/**
	Delete Serverless Service
	@author: DSundar3
	@version: 1.0
 **/

module.exports.handler = (event, context, cb) => {
	
	var errorHandler = errorHandlerModule();
	var config = configObj(event);
	//var secretHandler = secretHandlerModule();
	logger.init(event, context);
	
	if(!config.DELETE_SERVICE_JOB_URL) {
		logger.error("Service configuration missing JOB URL" + JSON.stringify(event));				
		return cb(JSON.stringify(errorHandler.throwInternalServerError("Service configuration missing JOB URL")));				
	}	
	if(!config.SVC_API_TOKEN_SECRET) {
		logger.error("Service configuration missing the Auth token config for Jenkins");
		return cb(JSON.stringify(errorHandler.throwInternalServerError("Service configuration missing the Auth token config for Jenkins")));				
	}
	
	if (!event.body) {
		logger.error("Service inputs not defined");
		return cb(JSON.stringify(errorHandler.throwInputValidationError("Service inputs not defined")));
	} else if(!event.body.service_name) {
		logger.error("Service Name is missing in the input");
		return cb(JSON.stringify(errorHandler.throwInputValidationError("Service Name is missing in the input")));		
	}else if(event.body.domain === undefined) {
		logger.error("Domain key is missing in the input");
		return cb(JSON.stringify(errorHandler.throwInputValidationError("Domain key is missing in the input")));		
	}
	var version = "LATEST";
	if(event.body.version) { // version is optional field
		version = event.body.version;
	}
		
    try {

		/*
		var decryptObj = secretHandler.decryptSecret(config.SVC_API_TOKEN_SECRET);
		var base_auth_token = "";
		var decryptionerror = "";
		var svc_user_password = "";		
		if (decryptObj.error !== undefined && decryptObj.error === true) {
			decryptionerror = decryptObj.message;
			logger.error("decryptionerror..: "+decryptionerror);
			return cb(JSON.stringify(errorHandler.throwInternalServerError(decryptionerror)));			
		} else {
			svc_user_password = decryptObj.message;			
			base_auth_token = "Basic " + new Buffer(config.SVC_USER + ":" + svc_user_password).toString("base64");
		}
		*/
		var base_auth_token = "Basic " + new Buffer(config.SVC_USER + ":" + config.SVC_PASWD).toString("base64");

		var req = payloads.requestLoad;
		req.url = config.DELETE_SERVICE_JOB_URL + "?token=" + config.JOB_TOKEN;
		req.headers.Authorization = base_auth_token;
		
		var params = payloads.buildParams;
		params.service_name = event.body.service_name;
		params.domain = event.body.domain;
		params.version = version;
		var tracking_id = Guid.create().value;		
		params.tracking_id = tracking_id;

		req.qs = params;
		request(req, function (error, response, body) {
			if (error) {
				logger.error("request errored..: "+JSON.stringify(error));
				return cb(JSON.stringify(errorHandler.throwInternalServerError("Internal error occurred")));
			} else {
				if(response.statusCode === 200 || response.statusCode === 201) {
					logger.info("success..: "+JSON.stringify(response));
					payloads.responseLoad.request_id = tracking_id;
					return cb(null, responseObj(payloads.responseLoad, event.body));
				} else if(response.statusCode === 401){
					logger.error("Failed..: "+JSON.stringify(response));				
					return cb(JSON.stringify(errorHandler.throwInternalServerError("Not authorized")));
				}else {
					logger.error("Failed..: "+JSON.stringify(response));				
					return cb(JSON.stringify(errorHandler.throwInternalServerError("Internal error occurred")));
				}
			}
		});		
		
	}catch(ex) {
        logger.error('Error : ', ex.message);
        cb(JSON.stringify(errorHandler.throwInternalServerError("Internal error occurred")));
    }
	
};
