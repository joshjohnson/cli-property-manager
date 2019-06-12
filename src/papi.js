//  Copyright 2018. Akamai Technologies, Inc
//  
//  Licensed under the Apache License, Version 2.0 (the "License");
//  you may not use this file except in compliance with the License.
//  You may obtain a copy of the License at
//  
//      http://www.apache.org/licenses/LICENSE-2.0
//  
//  Unless required by applicable law or agreed to in writing, software
//  distributed under the License is distributed on an "AS IS" BASIS,
//  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//  See the License for the specific language governing permissions and
//  limitations under the License.


const _ = require('underscore');

/*
 * activation type used as a parameter in activateProperty
 */
const ActivationType = require('./enums/ActivationType');

/**
 * PAPI REST client
 */
class PAPI {
    constructor(openClient, accountKey) {
        this.openClient = openClient;
        this.accountKey = accountKey;
    }

    addAccountKey(url) {
      if (this.accountKey) {
        if (url.includes('?')) {
          url += '&';
        } else {
          url += '?';
        }
        url += `accountSwitchKey=${this.accountKey}`;
      }
      return url;
    }

    findProperty(name) {
        let searchBody = {
            "propertyName": name
        };

        return this.openClient.post(this.addAccountKey('/papi/v1/search/find-by-value'), searchBody);
    }

    createProperty(name, productId, contractId, groupId, ruleFormat, propertyId, propertyVersion, copyHostnames = false) {
        let url = this.addAccountKey(`/papi/v0/properties?groupId=${groupId}&contractId=${contractId}`);
        let body = {
            "productId": productId,
            "propertyName": name,
        };
        if (_.isString(ruleFormat)) {
            body.ruleFormat = ruleFormat;
        }
        if (_.isNumber(propertyId) && _.isNumber(propertyVersion)) {
            body.cloneFrom = {
                "propertyId": propertyId,
                "version": propertyVersion,
                "copyHostnames": copyHostnames
            };
        }
        return this.openClient.post(url, body);
    }

    createNewPropertyVersion(propertyId, createFromVersion, createFromVersionEtag) {
        let postBody = {
            createFromVersion,
            createFromVersionEtag
        };
        let url = this.addAccountKey(`/papi/v0/properties/${propertyId}/versions/`);
        return this.openClient.post(url, postBody);
    }

    latestPropertyVersion(propertyId) {
        let url = this.addAccountKey(`/papi/v0/properties/${propertyId}/versions/latest`);
        return this.openClient.get(url);
    }

    getPropertyVersion(propertyId, versionId) {
        let url = this.addAccountKey(`/papi/v0/properties/${propertyId}/versions/${versionId}`);
        return this.openClient.get(url);
    }

    setRuleFormat(ruleFormat) {
        let clientSettings = {
            "ruleFormat": ruleFormat,
        };
        return this.setClientSettings(clientSettings);
    }

    /**
     * Set or unset PAPI id prefixes
     * @param usePrefixes
     */
    setClientSettings(clientSettings) {
        let url = this.addAccountKey('/papi/v0/client-settings');
        return this.openClient.put(url, clientSettings);
    }

    getClientSettings() {
        let url = this.addAccountKey(`/papi/v0/client-settings`);
        return this.openClient.get(url);
    }

    listProducts(contractId) {
        return this.openClient.get(this.addAccountKey(`/papi/v0/products?contractId=${contractId}`));
    }

    listContracts() {
        return this.openClient.get(this.addAccountKey('/papi/v0/contracts'));
    }

    listGroups() {
        return this.openClient.get(this.addAccountKey('/papi/v0/groups'));
    }

    getPropertyVersionRules(propertyId, propertyVersion, ruleFormat) {
        let url = this.addAccountKey(`/papi/v0/properties/${propertyId}/versions/${propertyVersion}/rules`);
        let headers = {};
        if (_.isString(ruleFormat)) {
            headers.Accept = `application/vnd.akamai.papirules.${ruleFormat}+json`;
        }
        return this.openClient.get(url, headers);
    }

    storePropertyVersionRules(propertyId, propertyVersion, rules, ruleFormat) {
        let url = this.addAccountKey(`/papi/v0/properties/${propertyId}/versions/${propertyVersion}/rules`);
        let headers = {
            'Content-Type': "application/json"
        };
        if (_.isString(ruleFormat)) {
            headers["Content-Type"] = `application/vnd.akamai.papirules.${ruleFormat}+json`;
            headers.Accept = `application/vnd.akamai.papirules.${ruleFormat}+json`;
        }
        return this.openClient.put(url, rules, headers);
    }

    validatePropertyVersionRules(propertyId, propertyVersion, rules, ruleFormat) {
        let url = this.addAccountKey(`/papi/v0/properties/${propertyId}/versions/${propertyVersion}/rules?dryRun=true`);
        let headers = {
            'Content-Type': "application/json"
        };
        if (_.isString(ruleFormat)) {
            headers["Content-Type"] = `application/vnd.akamai.papirules.${ruleFormat}+json`;
            headers.Accept = `application/vnd.akamai.papirules.${ruleFormat}+json`;

        }
        return this.openClient.put(url, rules, headers);
    }

    getPropertyVersionHostnames(propertyId, propertyVersion) {
        let url = this.addAccountKey(`/papi/v0/properties/${propertyId}/versions/${propertyVersion}/hostnames`);
        return this.openClient.get(url);
    }

    storePropertyVersionHostnames(propertyId, propertyVersion, hostnames, contractId, groupId) {
        let url = this.addAccountKey(`/papi/v0/properties/${propertyId}/versions/${propertyVersion}/hostnames?contractId=${contractId}&groupId=${groupId}`);
        return this.openClient.put(url, hostnames);
    }

    listCpcodes(contractId, groupId) {
        let url = this.addAccountKey(`/papi/v0/cpcodes?contractId=${contractId}&groupId=${groupId}`);
        return this.openClient.get(url);
    }

    listEdgeHostnames(contractId, groupId) {
        let url = this.addAccountKey(`/papi/v0/edgehostnames/?contractId=${contractId}&groupId=${groupId}`);
        return this.openClient.get(url);
    }

    createEdgeHostname(contractId, groupId, createRequestBody) {
        let url = this.addAccountKey(`/papi/v0/edgehostnames/?contractId=${contractId}&groupId=${groupId}`);
        return this.openClient.post(url, createRequestBody);
    }

    activateProperty(propertyId, propertyVersion, network, notifyEmails, message, activationType = ActivationType.ACTIVATE) {
        const url = this.addAccountKey(`/papi/v0/properties/${propertyId}/activations`);
        const acknowledgeAllWarnings = true;
        const complianceRecord = {
            noncomplianceReason: "NO_PRODUCTION_TRAFFIC"
        };
        const note = message || "Property Manager CLI Activation";
        return this.openClient.post(url, {
            propertyVersion,
            network,
            note,
            notifyEmails,
            acknowledgeAllWarnings,
            activationType,
            complianceRecord
        });
    }

    propertyActivateStatus(propertyId) {
        const url = this.addAccountKey(`/papi/v0/properties/${propertyId}/activations`);
        return this.openClient.get(url);
    }

    activationStatus(propertyId, activationId) {
        let url = this.addAccountKey(`/papi/v0/properties/${propertyId}/activations/${activationId}`);
        return this.openClient.get(url);
    }

    listRuleFormats() {
        let url = this.addAccountKey(`/papi/v0/rule-formats`);
        return this.openClient.get(url);
    }

    getPropertyInfo(propertyId) {
        let url = this.addAccountKey(`/papi/v0/properties/${propertyId}`);
        return this.openClient.get(url);
    }

}

module.exports = PAPI;
