/* eslint react/prop-types: 0 */
import React from 'react';
import { connect } from 'react-redux';
import tt from 'counterpart';
import {
    vestingSteem,
    delegatedSteem,
    powerdownSteem,
    pricePerSteem,
} from 'app/utils/StateFunctions';
import WalletSubMenu from 'app/components/elements/WalletSubMenu';
import shouldComponentUpdate from 'app/utils/shouldComponentUpdate';
import * as userActions from 'app/redux/UserReducer';
import LoadingIndicator from 'app/components/elements/LoadingIndicator';
import TimeAgoWrapper from 'app/components/elements/TimeAgoWrapper';

class Delegations extends React.Component {
    constructor() {
        super();
        this.shouldComponentUpdate = shouldComponentUpdate(this, 'Delegations');
    }

    componentWillMount() {
        this.props.vestingDelegationsLoading(true);
        this.props.getVestingDelegations(
            this.props.account.get('name'),
            (err, res) => {
                this.props.setVestingDelegations(res);
                this.props.vestingDelegationsLoading(false);
            }
        );
    }

    render() {
        const {
            account,
            currentUser,
            vestingDelegations,
            totalVestingFund,
            totalVestingShares,
            vestingDelegationsPending,
        } = this.props;

        const convertVestsToSteem = vests => {
            return ((vests * totalVestingFund) / totalVestingShares).toFixed(2);
        };

        // do not render if account is not loaded or available
        if (!account) return null;

        // do not render if state appears to contain only lite account info
        if (!account.has('vesting_shares')) return null;

        const isMyAccount =
            currentUser && currentUser.get('username') === account.get('name');

        // Used to show delegation transfer modal.
        const showTransfer = (asset, transferType, e) => {
            e.preventDefault();
            this.props.showTransfer({
                to: isMyAccount ? null : account.get('name'),
                asset,
                transferType,
            });
        };

        /// transfer log
        let idx = 0;
        // https://github.com/steemit/steem-js/tree/master/doc#get-vesting-delegations
        const delegation_log = vestingDelegations ? (
            vestingDelegations.map(item => {
                const vestsAsSteem = convertVestsToSteem(
                    parseFloat(item.vesting_shares)
                );
                return (
                    <tr
                        key={`${item.delegator}--${item.delegatee}--${
                            item.min_delegation_time
                        }`}
                    >
                        <td className={'red'}>{vestsAsSteem} STEEM</td>
                        <td>{item.delegatee}</td>
                        <td>
                            <TimeAgoWrapper date={item.min_delegation_time} />
                        </td>
                    </tr>
                );
            })
        ) : (
            <tr>No Delegations Found</tr>
        );

        const power_menu = [
            {
                value: tt('userwallet_jsx.delegate'),
                link: '#',
                onClick: showTransfer.bind(
                    this,
                    'DELEGATE_VESTS',
                    'Delegate to Account'
                ),
            },
        ];

        return (
            <div className="UserWallet">
                <div className="row">
                    <div className="columns small-10 medium-12 medium-expand">
                        <WalletSubMenu
                            accountname={account.get('name')}
                            isMyAccount={isMyAccount}
                        />
                    </div>
                </div>
                <div className="row">
                    <div className="column small-12">
                        <h4>Delegations</h4>
                        {vestingDelegationsPending && (
                            <LoadingIndicator type="circle" />
                        )}
                        <table>
                            <tbody>{delegation_log}</tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    }
}

export default connect(
    // mapStateToProps
    (state, ownProps) => {
        const vestingDelegations = state.user.get('vestingDelegations');

        const vestingDelegationsPending = state.user.get(
            'vestingDelegationsLoading'
        );
        const totalVestingShares = state.global.getIn([
            'props',
            'total_vesting_shares',
        ])
            ? parseFloat(
                  state.global
                      .getIn(['props', 'total_vesting_shares'])
                      .split(' ')[0]
              )
            : 0;

        const totalVestingFund = state.global.getIn([
            'props',
            'total_vesting_fund_steem',
        ])
            ? parseFloat(
                  state.global
                      .getIn(['props', 'total_vesting_fund_steem'])
                      .split(' ')[0]
              )
            : 0;
        return {
            ...ownProps,
            vestingDelegations,
            totalVestingShares,
            totalVestingFund,
            vestingDelegationsPending,
        };
    },
    // mapDispatchToProps
    dispatch => ({
        getVestingDelegations: (account, successCallback) => {
            dispatch(
                userActions.getVestingDelegations({ account, successCallback })
            );
        },
        setVestingDelegations: payload => {
            dispatch(userActions.setVestingDelegations(payload));
        },
        vestingDelegationsLoading: payload => {
            dispatch(userActions.vestingDelegationsLoading(payload));
        },
    })
)(Delegations);