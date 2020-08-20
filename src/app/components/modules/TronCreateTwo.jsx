import React, { Component } from 'react';
import tt from 'counterpart';
import { connect } from 'react-redux';
import * as userActions from 'app/redux/UserReducer';
import PdfDownload from 'app/components/elements/PdfDownload';
import { decryptedTronToken } from 'server/tronAccount';

const styles = {
    container: {
        display: 'flex',
        flexDirection: 'row',
        flexFlow: 'row wrap',
        marginTop: '40px',
    },
    flowBelow: {
        marginTop: '40px',
    },
};

class TronCreateTwo extends Component {
    constructor() {
        super();
        this.state = {
            tron_public: '',
            tron_private: '',
            tron_create: false,
        };
        this.handleSubmit = e => {
            e.preventDefault();
            this.props.hideTronCreateSuccess();
            sessionStorage.removeItem('tron_public_key');
            sessionStorage.removeItem('tron_private_key');
        };
    }
    componentDidUpdate(prevProps) {
        // start to download pdf key file
        if (this.props.tron_address !== prevProps.tron_address) {
            const tron_public = decryptedTronToken(
                sessionStorage.getItem('tron_public_key')
            );
            const tron_private = decryptedTronToken(
                sessionStorage.getItem('tron_private_key')
            );
            this.setState({
                tron_public: tron_public,
                tron_private: tron_private,
                tron_create: true,
            });
        }
    }

    render() {
        return (
            <div>
                <div>
                    <h3>{tt('tron_jsx.create_tron_success')}</h3>
                </div>
                <div style={styles.container}>
                    <div>{tt('tron_jsx.create_tron_success_content')}</div>
                    <div>
                        <PdfDownload
                            name={this.props.username}
                            tron_public_key={this.state.tron_public}
                            tron_private_key={this.state.tron_private}
                            newUser={false}
                            widthInches={8.5}
                            heightInches={11.0}
                            label="click download"
                            link={true}
                            download={this.state.tron_create}
                        />
                    </div>
                    <div>{tt('tron_jsx.update_success_content2')}</div>
                </div>
                <div style={styles.flowBelow}>
                    <button
                        type="submit"
                        className="button"
                        onClick={this.handleSubmit}
                    >
                        {tt('tron_jsx.safe_save_button')}
                    </button>
                </div>
            </div>
        );
    }
}

export default connect(
    // mapStateToProps
    (state, ownProps) => {
        const currentUser = state.user.get('current');
        const tron_user =
            currentUser && currentUser.has('tron_user')
                ? currentUser.get('tron_user')
                : false;
        const tron_address =
            currentUser && currentUser.has('tron_address')
                ? currentUser.get('tron_address')
                : '';
        const username =
            currentUser && currentUser.has('username')
                ? currentUser.get('tron_user')
                : '';
        return {
            ...ownProps,
            tron_user,
            tron_address,
            username,
        };
    },
    dispatch => ({
        hideTronCreateSuccess: () => {
            // if (e) e.preventDefault();
            dispatch(userActions.hideTronCreateSuccess());
        },
    })
)(TronCreateTwo);