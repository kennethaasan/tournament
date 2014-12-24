/* Controllers */

angular.module('app.controllers', [])

.controller('TournamentController', function($scope, $http, $interval) {

    $scope.loading = true;

    var getTournament = function() {
        $http.get('../../api/v1/tournaments/' + tournament_id + '/info').
            success(function(response) {
                $scope.loading = false;

                $scope.tournament = response.data.tournament;
                $scope.matches = response.data.matches;
                $scope.tables = response.data.tables;
            }).
            error(function(response) {
                console.log(response);
            });
    };

    getTournament();
    var interval = $interval(function() {
        getTournament();
    }, 30000);

});
