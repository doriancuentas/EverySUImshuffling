// ==UserScript==
// @name         Jira Rapid Board Shuffle Team
// @namespace    https://github.com/doriancuentas
// @version      0.2
// @description  A script to shuffle the Jira Rapid Board team members for fun!
// @author       Dorian Cuentas
// @match        https://*jira*/*/RapidBoard.jspa?rapidView*
// @grant        GM_registerMenuCommand
// @homepage     https://github.com/doriancuentas/EverySUImshuffling
// @supportURL   https://github.com/doriancuentas/EverySUImshuffling/issues
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    function initJiraShuffler() {
        function getChildrenAttributes(rootElement, selector) {
            const children = Array.from(rootElement.children);
            const result = children.map((child, index) => {
                const selectedElement = child.querySelector(selector);
                const attributeValue = selectedElement ? selectedElement.textContent : null;
                return {
                    order: index,
                    value: attributeValue
                };
            });
            return result;
        }


        function shuffleArray(array) {
            const shuffledArray = array.slice();
            for (let i = shuffledArray.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffledArray[i], shuffledArray[j]] = [shuffledArray[j], shuffledArray[i]];
            }
            shuffledArray.forEach((item, index) => {
                item.order = index;
            });
            return shuffledArray;
        }

        function storeDataInSessionStorage(key, data) {
            const jsonString = JSON.stringify(data);
            sessionStorage.setItem(key, jsonString);
        }

        function retrieveDataFromSessionStorage(key) {
            const jsonString = sessionStorage.getItem(key);
            return jsonString ? JSON.parse(jsonString) : null;
        }


        function applyOrderFromJsonList(rootElement, selector, orderJsonList) {
            if (!Array.isArray(orderJsonList)) {
                console.error('orderJsonList is not in the expected format');
                return;
            }

            const orderMap = new Map(orderJsonList.map(item => [item.value, item.order]));
            const children = Array.from(rootElement.children);
            const sortedChildren = [];

            children.forEach(child => {
                const selectedElement = child.querySelector(selector);
                const attributeValue = selectedElement ? selectedElement.textContent : null;
                const order = orderMap.get(attributeValue);

                if (order !== undefined) {
                    sortedChildren.push({ order, child });
                } else {
                    // If there's no order (e.g., new elements), add them to the end with a large order value
                    sortedChildren.push({ order: Number.MAX_VALUE, child });
                }
            });

            // Sort the children based on the order
            sortedChildren.sort((a, b) => a.order - b.order);

            // Get the height of the root element
            const rootHeight = rootElement.clientHeight;

            // Apply animations before reordering
            children.forEach(child => {
                child.style.transition = 'transform 0.3s ease-in-out'; // Make it faster
                const bounceHeight = Math.random() * rootHeight - rootHeight / 2;
                child.style.transform = `translateY(${bounceHeight}px)`;
            });

            // Reset the transform after a longer duration for a smooth bounce back
            setTimeout(() => {
                rootElement.innerHTML = '';
                sortedChildren.forEach(item => {
                    item.child.style.transition = 'transform 2.0s cubic-bezier(0.68, -0.55, 0.27, 1.55)';
                    item.child.style.transform = 'translateY(0)';
                    rootElement.appendChild(item.child);
                });
            }, 300);
        }


        function resetShuffle() {
            new_shuffle = shuffleArray(retrieveDataFromSessionStorage('shuffled_team_order'));
            storeDataInSessionStorage('shuffled_team_order', new_shuffle);
            applyOrderFromJsonList(document.getElementById('ghx-pool'), '.ghx-heading>span:first-of-type', new_shuffle);
        }

        function clearShuffleData() {
            storeDataInSessionStorage('shuffled_team_order', []);
        }

        function mainReorder() {
            console.debug("Getting data from hidden element")
            let stored_value = retrieveDataFromSessionStorage('shuffled_team_order');
            console.debug("Stored vale:" + stored_value);
            if (!stored_value) {
                console.debug("Stored value non existing, generating new one")
                let root_element = document.getElementById('ghx-pool');
                let team_member_name_selector = '.ghx-heading>span:first-of-type';
                let childrenAttributes = getChildrenAttributes(root_element, team_member_name_selector);
                stored_value = shuffleArray(childrenAttributes);
                storeDataInSessionStorage('shuffled_team_order', stored_value);
            }
            let root_element = document.getElementById('ghx-pool');
            let team_member_name_selector = '.ghx-heading>span:first-of-type';
            console.debug(`Applying custom order: ${stored_value.map(item => [item.value, item.order])}`)
            applyOrderFromJsonList(root_element, team_member_name_selector, stored_value);
        }

        const observerCallback = (mutationsList, observer) => {
            console.debug('Mutation callback triggered');
            for (const mutation of mutationsList) {
                console.debug(mutation);
                if (mutation.type === 'childList') {
                    console.debug('A child node has been added, removed, or reordered.');
                    observer.disconnect();
                    mainReorder();

                }
            }
        };

        window.JiraShuffler = {
            getChildrenAttributes,
            shuffleArray,
            storeDataInSessionStorage,
            retrieveDataFromSessionStorage,
            applyOrderFromJsonList,
            mainReorder
        };
    };

    initJiraShuffler();

    const script = document.createElement('script');
    script.textContent = initJiraShuffler.toString().replace(/^[^{]*{\s*/, '').replace(/\s*}[^}]*$/, '');
    document.body.appendChild(script);


    GM_registerMenuCommand("Shuffle team v0.2", () => {

        const observer = new MutationObserver(observerCallback);
        const config = { childList: true, subtree: true };
        const rootElement = document.getElementById('ghx-pool');
        observer.observe(rootElement, config);

        mainReorder();
    });

    GM_registerMenuCommand("Reset shuffle", () => {
        resetShuffle();
    });

    GM_registerMenuCommand("Clear shuffle data", () => {
        clearShuffleData();
    });
})();
