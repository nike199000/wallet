/* eslint-disable no-unused-vars */
module.exports = {
    up: (queryInterface, Sequelize) => {
        return queryInterface.addColumn('tron_reward_history', 'reward_type', {
            after: 'vests_per_steem',
            type: Sequelize.INTEGER,
            defaultValue: 0,
            allowNull: false,
        });
    },
    down: (queryInterface, Sequelize) => {
        return queryInterface.removeColumn(
            'tron_reward_history',
            'reward_type'
        );
    },
};
