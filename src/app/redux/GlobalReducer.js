import { Map, Set, List, fromJS, Iterable } from 'immutable';
import { emptyContent } from 'app/redux/EmptyState';
import { contentStats } from 'app/utils/StateFunctions';
import constants from './constants';

export const emptyContentMap = Map(emptyContent);

export const defaultState = Map({
    status: {},
});

// Action constants
const RECEIVE_STATE = 'global/RECEIVE_STATE';
const RECEIVE_ACCOUNT = 'global/RECEIVE_ACCOUNT';
const RECEIVE_ACCOUNTS = 'global/RECEIVE_ACCOUNTS';
const UPDATE_ACCOUNT_WITNESS_VOTE = 'global/UPDATE_ACCOUNT_WITNESS_VOTE';
const UPDATE_ACCOUNT_WITNESS_PROXY = 'global/UPDATE_ACCOUNT_WITNESS_PROXY';
const FETCHING_DATA = 'global/FETCHING_DATA';
const RECEIVE_DATA = 'global/RECEIVE_DATA';
const RECEIVE_RECENT_POSTS = 'global/RECEIVE_RECENT_POSTS';
const REQUEST_META = 'global/REQUEST_META';
const RECEIVE_META = 'global/RECEIVE_META';
const SET = 'global/SET';
const REMOVE = 'global/REMOVE';
const UPDATE = 'global/UPDATE';
const SET_META_DATA = 'global/SET_META_DATA';
const CLEAR_META = 'global/CLEAR_META';
const CLEAR_META_ELEMENT = 'global/CLEAR_META_ELEMENT';
const FETCH_JSON = 'global/FETCH_JSON';
const FETCH_JSON_RESULT = 'global/FETCH_JSON_RESULT';
const SHOW_DIALOG = 'global/SHOW_DIALOG';
const HIDE_DIALOG = 'global/HIDE_DIALOG';
const ADD_ACTIVE_WITNESS_VOTE = 'global/ADD_ACTIVE_WITNESS_VOTE';
const REMOVE_ACTIVE_WITNESS_VOTE = 'global/REMOVE_ACTIVE_WITNESS_VOTE';
// Saga-related:
export const GET_STATE = 'global/GET_STATE';

/**
 * Transfrom nested JS object to appropriate immutable collection.
 *
 * @param {Object} account
 */

const transformAccount = account =>
    fromJS(account, (key, value) => {
        if (key === 'witness_votes') return value.toSet();
        const isIndexed = Iterable.isIndexed(value);
        return isIndexed ? value.toList() : value.toOrderedMap();
    });

/**
 * Merging accounts: A get_state will provide a very full account but a get_accounts will provide a smaller version this makes sure we don't overwrite
 *
 * @param {Immutable.Map} state
 * @param {Immutable.Map} account
 *
 */

const mergeAccounts = (state, account) => {
    return state.updateIn(['accounts', account.get('name')], Map(), a =>
        a.mergeDeep(account)
    );
};

export default function reducer(state = defaultState, action = {}) {
    const payload = action.payload;

    switch (action.type) {
        case RECEIVE_STATE: {
            let new_state = fromJS(payload);
            if (new_state.has('content')) {
                const content = new_state.get('content').withMutations(c => {
                    c.forEach((cc, key) => {
                        cc = emptyContentMap.mergeDeep(cc);
                        const stats = fromJS(contentStats(cc));
                        c.setIn([key, 'stats'], stats);
                    });
                });
                new_state = new_state.set('content', content);
            }
            // let transfer_history from new state override completely, otherwise
            // deep merge may not work as intended.
            const mergedState = state.mergeDeep(new_state);
            return mergedState.update(
                'accounts',
                accountMap =>
                    accountMap
                        ? accountMap.map(
                              (v, k) =>
                                  new_state.hasIn([
                                      'accounts',
                                      k,
                                      'transfer_history',
                                  ])
                                      ? v.set(
                                            'transfer_history',
                                            new_state.getIn([
                                                'accounts',
                                                k,
                                                'transfer_history',
                                            ])
                                        )
                                      : v
                          )
                        : accountMap
            );
        }

        case RECEIVE_ACCOUNT: {
            const account = transformAccount(payload.account);
            return mergeAccounts(state, account);
        }

        case RECEIVE_ACCOUNTS: {
            return payload.accounts.reduce((acc, curr) => {
                const transformed = transformAccount(curr);
                return mergeAccounts(acc, transformed);
            }, state);
        }

        case UPDATE_ACCOUNT_WITNESS_VOTE: {
            const { account, witness, approve } = payload;
            return state.updateIn(
                ['accounts', account, 'witness_votes'],
                Set(),
                votes =>
                    approve
                        ? Set(votes).add(witness)
                        : Set(votes).remove(witness)
            );
        }

        case UPDATE_ACCOUNT_WITNESS_PROXY: {
            const { account, proxy } = payload;
            return state.setIn(['accounts', account, 'proxy'], proxy);
        }

        case FETCHING_DATA: {
            const { order, category } = payload;
            const new_state = state.updateIn(
                ['status', category || '', order],
                () => {
                    return { fetching: true };
                }
            );
            return new_state;
        }

        case RECEIVE_DATA: {
            const {
                data,
                order,
                category,
                accountname,
                fetching,
                endOfData,
            } = payload;
            let new_state;
            if (
                order === 'by_author' ||
                order === 'by_feed' ||
                order === 'by_comments' ||
                order === 'by_replies'
            ) {
                // category is either "blog", "feed", "comments", or "recent_replies" (respectively) -- and all posts are keyed under current profile
                const key = ['accounts', accountname, category];
                new_state = state.updateIn(key, List(), list => {
                    return list.withMutations(posts => {
                        data.forEach(value => {
                            const key2 = `${value.author}/${value.permlink}`;
                            if (!posts.includes(key2)) posts.push(key2);
                        });
                    });
                });
            } else {
                new_state = state.updateIn(
                    ['discussion_idx', category || '', order],
                    list => {
                        return list.withMutations(posts => {
                            data.forEach(value => {
                                const entry = `${value.author}/${
                                    value.permlink
                                }`;
                                if (!posts.includes(entry)) posts.push(entry);
                            });
                        });
                    }
                );
            }
            new_state = new_state.updateIn(['content'], content => {
                return content.withMutations(map => {
                    data.forEach(value => {
                        const key = `${value.author}/${value.permlink}`;
                        value = fromJS(value);
                        value = value.set('stats', fromJS(contentStats(value)));
                        map.set(key, value);
                    });
                });
            });
            new_state = new_state.updateIn(
                ['status', category || '', order],
                () => {
                    if (endOfData) {
                        return { fetching, last_fetch: new Date() };
                    }
                    return { fetching };
                }
            );
            return new_state;
        }
        case RECEIVE_RECENT_POSTS: {
            const { data } = payload;
            let new_state = state.updateIn(
                ['discussion_idx', '', 'created'],
                list => {
                    if (!list) list = List();
                    return list.withMutations(posts => {
                        data.forEach(value => {
                            const entry = `${value.author}/${value.permlink}`;
                            if (!posts.includes(entry)) posts.unshift(entry);
                        });
                    });
                }
            );
            new_state = new_state.updateIn(['content'], content => {
                return content.withMutations(map => {
                    data.forEach(value => {
                        const key = `${value.author}/${value.permlink}`;
                        if (!map.has(key)) {
                            value = fromJS(value);
                            value = value.set(
                                'stats',
                                fromJS(contentStats(value))
                            );

                            map.set(key, value);
                        }
                    });
                });
            });
            return new_state;
        }

        case REQUEST_META: {
            const { id, link } = payload;
            return state.setIn(['metaLinkData', id], Map({ link }));
        }

        case RECEIVE_META: {
            const { id, meta } = payload;
            return state.updateIn(['metaLinkData', id], data =>
                data.merge(meta)
            );
        }

        case SET: {
            const { key, value } = payload;
            const key_array = Array.isArray(key) ? key : [key];
            return state.setIn(key_array, fromJS(value));
        }

        case REMOVE: {
            const key = Array.isArray(payload.key)
                ? payload.key
                : [payload.key];
            return state.removeIn(key);
        }

        case UPDATE: {
            const { key, notSet = Map(), updater } = payload;
            return state.updateIn(key, notSet, updater);
        }

        case SET_META_DATA: {
            const { id, meta } = payload;
            return state.setIn(['metaLinkData', id], fromJS(meta));
        }

        case CLEAR_META: {
            return state.deleteIn(['metaLinkData', payload.id]);
        }

        case CLEAR_META_ELEMENT: {
            const { formId, element } = payload;
            return state.updateIn(['metaLinkData', formId], data =>
                data.remove(element)
            );
        }

        case FETCH_JSON: {
            return state;
        }

        case FETCH_JSON_RESULT: {
            const { id, result, error } = payload;
            return state.set(id, fromJS({ result, error }));
        }

        case SHOW_DIALOG: {
            const { name, params = {} } = payload;
            return state.update('active_dialogs', Map(), d =>
                d.set(name, fromJS({ params }))
            );
        }

        case HIDE_DIALOG: {
            return state.update('active_dialogs', d => d.delete(payload.name));
        }

        case ADD_ACTIVE_WITNESS_VOTE: {
            return state.update(
                `transaction_witness_vote_active_${payload.account}`,
                Set(),
                s => s.add(payload.witness)
            );
        }

        case REMOVE_ACTIVE_WITNESS_VOTE: {
            return state.update(
                `transaction_witness_vote_active_${payload.account}`,
                s => s.delete(payload.witness)
            );
        }

        default:
            return state;
    }
}

// Action creators

export const receiveState = payload => ({
    type: RECEIVE_STATE,
    payload,
});

export const receiveAccount = payload => ({
    type: RECEIVE_ACCOUNT,
    payload,
});

export const receiveAccounts = payload => ({
    type: RECEIVE_ACCOUNTS,
    payload,
});

export const updateAccountWitnessVote = payload => ({
    type: UPDATE_ACCOUNT_WITNESS_VOTE,
    payload,
});

export const updateAccountWitnessProxy = payload => ({
    type: UPDATE_ACCOUNT_WITNESS_PROXY,
    payload,
});

export const fetchingData = payload => ({
    type: FETCHING_DATA,
    payload,
});

export const receiveData = payload => ({
    type: RECEIVE_DATA,
    payload,
});

export const receiveRecentPosts = payload => ({
    type: RECEIVE_RECENT_POSTS,
    payload,
});

export const requestMeta = payload => ({
    type: REQUEST_META,
    payload,
});

export const receiveMeta = payload => ({
    type: RECEIVE_META,
    payload,
});

// TODO: Find a better name for this
export const set = payload => ({
    type: SET,
    payload,
});

export const remove = payload => ({
    type: REMOVE,
    payload,
});

export const update = payload => ({
    type: UPDATE,
    payload,
});

export const setMetaData = payload => ({
    type: SET_META_DATA,
    payload,
});

export const clearMeta = payload => ({
    type: CLEAR_META,
    payload,
});

export const clearMetaElement = payload => ({
    type: CLEAR_META_ELEMENT,
    payload,
});

export const fetchJson = payload => ({
    type: FETCH_JSON,
    payload,
});

export const fetchJsonResult = payload => ({
    type: FETCH_JSON_RESULT,
    payload,
});

export const showDialog = payload => ({
    type: SHOW_DIALOG,
    payload,
});

export const hideDialog = payload => ({
    type: HIDE_DIALOG,
    payload,
});

export const addActiveWitnessVote = payload => ({
    type: ADD_ACTIVE_WITNESS_VOTE,
    payload,
});

export const removeActiveWitnessVote = payload => ({
    type: REMOVE_ACTIVE_WITNESS_VOTE,
    payload,
});

export const getState = payload => ({
    type: GET_STATE,
    payload,
});
