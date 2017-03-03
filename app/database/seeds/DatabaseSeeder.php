<?php
use \Faker\Factory as Faker;
class DatabaseSeeder extends Seeder {
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        Eloquent::unguard();
        $this->call('UserTableSeeder');
        $this->command->info('User table seeded!');
        $this->call('TournamentTableSeeder');
        $this->command->info('Tournament table seeded!');
        $this->call('TeamsTableSeeder');
        $this->command->info('Team table seeded!');
        $this->call('MatchesTableSeeder');
        $this->command->info('Match table seeded!');
        /*$this->call('PlayersTableSeeder');
        $this->command->info('Player table seeded!');
        $this->call('GoalsTableSeeder');
        $this->command->info('Goal table seeded!');*/
    }
}
class UserTableSeeder extends Seeder {
    public function run()
    {
        DB::table('users')->delete();
        User::create(array(
            'email' => 'admin@admin.no',
            'password' => Hash::make('admin'),
            'admin' => true
        ));
        User::create(array(
            'email' => 'admin2@admin2.no',
            'password' => Hash::make('admin2'),
            'admin' => true
        ));
    }
}
class TournamentTableSeeder extends Seeder {
    public function run()
    {
        DB::table('tournaments')->delete();
        Tournament::create(array(
            'name' => 'Vanvikan Indoor G14',
            'date' => '2017-03-03',
            'location' => 'Vanvikanhallen'
        ));
        Tournament::create(array(
            'name' => 'Vanvikan Indoor G16',
            'date' => '2017-03-03',
            'location' => 'Vanvikanhallen'
        ));
        Tournament::create(array(
            'name' => 'Vanvikan Indoor J14',
            'date' => '2017-03-04',
            'location' => 'Vanvikanhallen'
        ));
				Tournament::create(array(
            'name' => 'Vanvikan Indoor J15',
            'date' => '2017-03-04',
            'location' => 'Vanvikanhallen'
        ));
				Tournament::create(array(
            'name' => 'Vanvikan Indoor J17',
            'date' => '2017-03-04',
            'location' => 'Vanvikanhallen'
        ));
    }
}
class TeamsTableSeeder extends Seeder {
    public function run()
    {
        DB::table('teams')->delete();
        Team::create(array('name' => 'Vinner gruppe A')); //1
        Team::create(array('name' => '2. plass gruppe A')); //2
        Team::create(array('name' => 'Vinner gruppe B')); //3
        Team::create(array('name' => '2. plass gruppe B')); //4
        Team::create(array('name' => 'Vinner gruppe C')); //5
        Team::create(array('name' => '2. plass gruppe C')); //6
        Team::create(array('name' => 'Vinner gruppe D')); //7
        Team::create(array('name' => '2. plass gruppe D')); //8
        Team::create(array('name' => 'Vinner Q1')); //9
        Team::create(array('name' => 'Vinner Q2')); //10
        Team::create(array('name' => 'Vinner Q3')); //11
        Team::create(array('name' => 'Vinner Q4')); //12
        Team::create(array('name' => 'Vinner S1')); //13
        Team::create(array('name' => 'Vinner S2')); //14
        Team::create(array('name' => 'Tapende lag S1')); //15
        Team::create(array('name' => 'Tapende lag S2')); //16
        Team::create(array('name' => '3. plass gruppe A')); //17
        Team::create(array('name' => '4. plass gruppe A')); //18
        Team::create(array('name' => '3. plass gruppe B')); //19
        Team::create(array('name' => '4. plass gruppe B')); //20

        Team::create(array('name' => 'Vanvik/Stadsbygd 1', 'group_code' => 'A'));
        Team::create(array('name' => 'Fosen 3', 'group_code' => 'A'));
        Team::create(array('name' => 'Buvik 1', 'group_code' => 'A'));
        Team::create(array('name' => 'Inderøy 2', 'group_code' => 'A'));
        Team::create(array('name' => 'Vanvik/Stadsbygd 2', 'group_code' => 'B'));
        Team::create(array('name' => 'Vestbyen 3', 'group_code' => 'B'));
        Team::create(array('name' => 'Fosen 2', 'group_code' => 'B'));
        Team::create(array('name' => 'Heimdal 1', 'group_code' => 'B'));
        Team::create(array('name' => 'Vanvik/Stadsbygd 3', 'group_code' => 'C'));
        Team::create(array('name' => 'Vestbyen 2', 'group_code' => 'C'));
        Team::create(array('name' => 'Fosen 1', 'group_code' => 'C'));
        Team::create(array('name' => 'Inderøy 1', 'group_code' => 'C'));
        Team::create(array('name' => 'Vanvik/Stadsbygd 4', 'group_code' => 'D'));
        Team::create(array('name' => 'Vestbyen 1', 'group_code' => 'D'));
        Team::create(array('name' => 'Buvik 2', 'group_code' => 'D'));
        Team::create(array('name' => 'Heimdal 2', 'group_code' => 'D'));

        Team::create(array('name' => 'Freidig 3', 'group_code' => 'A'));
        Team::create(array('name' => 'Åfjord 1', 'group_code' => 'A'));
        Team::create(array('name' => 'Vanvik 1', 'group_code' => 'A'));
        Team::create(array('name' => 'Nardo 2', 'group_code' => 'A'));
        Team::create(array('name' => 'Fosen', 'group_code' => 'B'));
        Team::create(array('name' => 'Buvik 1', 'group_code' => 'B'));
        Team::create(array('name' => 'Vanvik 2', 'group_code' => 'B'));
        Team::create(array('name' => 'Leksvik', 'group_code' => 'B'));
        Team::create(array('name' => 'Freidig 1', 'group_code' => 'C'));
        Team::create(array('name' => 'Buvik 2', 'group_code' => 'C'));
        Team::create(array('name' => 'Ørland', 'group_code' => 'C'));
        Team::create(array('name' => 'Lag 1', 'group_code' => 'C'));
        Team::create(array('name' => 'Freidig 2', 'group_code' => 'D'));
        Team::create(array('name' => 'Åfjord 2', 'group_code' => 'D'));
        Team::create(array('name' => 'Nardo 1', 'group_code' => 'D'));
        Team::create(array('name' => 'Lag 2', 'group_code' => 'D'));

        Team::create(array('name' => 'Skaun 2', 'group_code' => 'A'));
        Team::create(array('name' => 'Hil Fevåg/Stjørna', 'group_code' => 'A'));
        Team::create(array('name' => 'Stadsbygd 1', 'group_code' => 'A'));
        Team::create(array('name' => 'Lag 1', 'group_code' => 'A'));
        Team::create(array('name' => 'Skaun 1', 'group_code' => 'B'));
        Team::create(array('name' => 'Trygg/Lade', 'group_code' => 'B'));
        Team::create(array('name' => 'Stadsbygd 2', 'group_code' => 'B'));
        Team::create(array('name' => 'Lag 2', 'group_code' => 'B'));

        Team::create(array('name' => 'Freidig 1', 'group_code' => 'A'));
        Team::create(array('name' => 'Malvik 2', 'group_code' => 'A'));
        Team::create(array('name' => 'Nardo', 'group_code' => 'A'));
        Team::create(array('name' => 'Skjelstadmark 1', 'group_code' => 'A'));
        Team::create(array('name' => 'Freidig 2', 'group_code' => 'B'));
        Team::create(array('name' => 'Malvik 1', 'group_code' => 'B'));
        Team::create(array('name' => 'Rissa', 'group_code' => 'B'));
        Team::create(array('name' => 'Skjelstadmark 2', 'group_code' => 'B'));

        Team::create(array('name' => 'Trygg/Lade 2', 'group_code' => 'A'));
        Team::create(array('name' => 'Oppdal', 'group_code' => 'A'));
        Team::create(array('name' => 'Meldal', 'group_code' => 'A'));
        Team::create(array('name' => 'Stadsbygd/Rissa 1', 'group_code' => 'A'));
        Team::create(array('name' => 'Trygg/Lade 1', 'group_code' => 'B'));
        Team::create(array('name' => 'Hil Fevåg/Stjørna', 'group_code' => 'B'));
        Team::create(array('name' => 'Støren', 'group_code' => 'B'));
        Team::create(array('name' => 'Stadsbygd/Rissa 2', 'group_code' => 'B'));
    }
}
class PlayersTableSeeder extends Seeder {
    public function run()
    {
        DB::table('players')->delete();
        $faker = Faker::create();
        foreach (range(1, 200) as $index) {
            Player::create(array(
                'name' => $faker->name(),
                'number' => $faker->numberBetween(1, 99),
                'paid' => $faker->boolean(),
                'team_id' => $faker->numberBetween(1, 20)
            ));
        }
    }
}
class MatchesTableSeeder extends Seeder {
    public function run() {
        DB::table('matches')->delete();
        $this->generateTournamentWith16TeamsAtMorning(1, 21);
        $this->generateTournamentWith16TeamsAtNight(2, 21 + 16);
        // $this->generateTournamentWith16TeamsAtMorning(3, 21 + 16 + 16);
        // $this->generateTournamentWith16TeamsAtNight(4, 21 + 16 + 16 + 16);
        // $this->generateTournamentCustom(3, 21 + 16 + 16 + 16);
        $this->generateTournamentWith8Teams(3, 21 + 16 + 16, 9);
        $this->generateTournamentWith8Teams(4, 21 + 16 + 16 + 8, 12);
        $this->generateTournamentWith8Teams(5, 21 + 16 + 16 + 8 + 8, 15);
    }
    // private function generateTournamentCustom($tournament_id, $team_id) {
    //     $this->generateMatch($tournament_id, '09:00', 1, 'A', $team_id, $team_id + 1);
    //     $this->generateMatch($tournament_id, '09:00', 2, 'A', $team_id + 4, $team_id + 3);
    //
    //     $this->generateMatch($tournament_id, '09:20', 1, 'B', $team_id + 6, $team_id + 7);
    //     $this->generateMatch($tournament_id, '09:20', 2, 'B', $team_id + 10, $team_id + 8);
    //
    //     $this->generateMatch($tournament_id, '09:40', 1, 'A', $team_id + 3, $team_id);
    //     $this->generateMatch($tournament_id, '09:40', 2, 'A', $team_id + 5, $team_id + 4);
    //
    //     $this->generateMatch($tournament_id, '10:00', 2, 'A', $team_id + 1, $team_id + 2);
    //     $this->generateMatch($tournament_id, '10:00', 2, 'B', $team_id + 10, $team_id + 6);
    //
    //     $this->generateMatch($tournament_id, '10:20', 1, 'A', $team_id, $team_id + 4);
    //     $this->generateMatch($tournament_id, '10:20', 2, 'A', $team_id + 5, $team_id + 3);
    //
    //     $this->generateMatch($tournament_id, '10:40', 1, 'B', $team_id + 9, $team_id + 7);
    //     $this->generateMatch($tournament_id, '10:40', 2, 'B', $team_id + 6, $team_id + 8);
    //
    //     $this->generateMatch($tournament_id, '11:00', 1, 'A', $team_id + 1, $team_id + 4);
    //     $this->generateMatch($tournament_id, '11:00', 2, 'A', $team_id, $team_id + 2);
    //
    //     $this->generateMatch($tournament_id, '11:20', 1, 'B', $team_id + 9, $team_id + 10);
    //     $this->generateMatch($tournament_id, '11:20', 2, 'B', $team_id + 7, $team_id + 8);
    //
    //     $this->generateMatch($tournament_id, '11:40', 1, 'A', $team_id + 2, $team_id + 3);
    //     $this->generateMatch($tournament_id, '11:40', 2, 'A', $team_id + 5, $team_id + 1);
    //
    //     $this->generateMatch($tournament_id, '12:00', 1, 'B', $team_id + 9, $team_id + 6);
    //     $this->generateMatch($tournament_id, '12:00', 2, 'B', null, null);
    //
    //     $this->generateMatch($tournament_id, '12:20', 1, 'A', $team_id + 4, $team_id + 2);
    //     $this->generateMatch($tournament_id, '12:20', 2, 'A', $team_id + 5, $team_id);
    //
    //     $this->generateMatch($tournament_id, '12:40', 1, 'B', $team_id + 7, $team_id + 10);
    //     $this->generateMatch($tournament_id, '12:40', 2, 'B', $team_id + 8, $team_id + 9);
    //
    //     $this->generateMatch($tournament_id, '13:00', 1, 'A', $team_id + 3, $team_id + 1);
    //     $this->generateMatch($tournament_id, '13:00', 2, 'A', $team_id + 2, $team_id + 5);
    //
    //
    //     $this->generateMatch($tournament_id, '13:20', 1, 'Q1', 1, 19);
    //     $this->generateMatch($tournament_id, '13:20', 2, 'Q2', 2, 20);
    //
    //     $this->generateMatch($tournament_id, '13:40', 1, 'Q3', 3, 17);
    //     $this->generateMatch($tournament_id, '13:40', 2, 'Q4', 4, 18);
    //
    //     $this->generateMatch($tournament_id, '14:00', 1, 'S1', 9, 10);
    //     $this->generateMatch($tournament_id, '14:00', 2, 'S2', 11, 12);
    //
    //     $this->generateMatch($tournament_id, '14:20', 1, 'F', 13, 14);
    //     $this->generateMatch($tournament_id, '14:20', 2, 'BF', 15, 16);
    // }
    private function generateTournamentWith16TeamsAtMorning($tournament_id, $team_id) {
        $this->generateMatch($tournament_id, '09:00', 1, 'A', $team_id, $team_id + 1);
        $this->generateMatch($tournament_id, '09:00', 2, 'A', $team_id + 2, $team_id + 3);
        $this->generateMatch($tournament_id, '09:20', 1, 'B', $team_id + 4, $team_id + 5);
        $this->generateMatch($tournament_id, '09:20', 2, 'B', $team_id + 6, $team_id + 7);
        $this->generateMatch($tournament_id, '09:40', 1, 'C', $team_id + 8, $team_id + 9);
        $this->generateMatch($tournament_id, '09:40', 2, 'C', $team_id + 10, $team_id + 11);
        $this->generateMatch($tournament_id, '10:00', 1, 'D', $team_id + 12, $team_id + 13);
        $this->generateMatch($tournament_id, '10:00', 2, 'D', $team_id + 14, $team_id + 15);
        $this->generateMatch($tournament_id, '10:20', 1, 'A', $team_id + 1, $team_id + 2);
        $this->generateMatch($tournament_id, '10:20', 2, 'A', $team_id + 3, $team_id);
        $this->generateMatch($tournament_id, '10:40', 1, 'B', $team_id + 1 + 4, $team_id + 2 + 4);
        $this->generateMatch($tournament_id, '10:40', 2, 'B', $team_id + 3 + 4, $team_id + 4);
        $this->generateMatch($tournament_id, '11:00', 1, 'C', $team_id + 1 + 8, $team_id + 2 + 8);
        $this->generateMatch($tournament_id, '11:00', 2, 'C', $team_id + 3 + 8, $team_id + 8);
        $this->generateMatch($tournament_id, '11:20', 1, 'D', $team_id + 1 + 12, $team_id + 2 + 12);
        $this->generateMatch($tournament_id, '11:20', 2, 'D', $team_id + 3 + 12, $team_id + 12);
        $this->generateMatch($tournament_id, '11:40', 1, 'A', $team_id, $team_id + 2);
        $this->generateMatch($tournament_id, '11:40', 2, 'A', $team_id + 3, $team_id + 1);
        $this->generateMatch($tournament_id, '12:00', 1, 'B', $team_id + 4, $team_id + 2 + 4);
        $this->generateMatch($tournament_id, '12:00', 2, 'B', $team_id + 3 + 4, $team_id + 1 + 4);
        $this->generateMatch($tournament_id, '12:20', 1, 'C', $team_id + 8, $team_id + 2 + 8);
        $this->generateMatch($tournament_id, '12:20', 2, 'C', $team_id + 3 + 8, $team_id + 1 + 8);
        $this->generateMatch($tournament_id, '12:40', 1, 'D', $team_id + 12, $team_id + 2 + 12);
        $this->generateMatch($tournament_id, '12:40', 2, 'D', $team_id + 3 + 12, $team_id + 1 + 12);
        $this->generateMatch($tournament_id, '13:00', 1, 'Q1', 1, 6);
        $this->generateMatch($tournament_id, '13:00', 2, 'Q2', 3, 8);
        $this->generateMatch($tournament_id, '13:20', 1, 'Q3', 5, 2);
        $this->generateMatch($tournament_id, '13:20', 2, 'Q4', 7, 4);
        $this->generateMatch($tournament_id, '13:50', 1, 'S1', 9, 10);
        $this->generateMatch($tournament_id, '13:50', 2, 'S2', 11, 12);
        $this->generateMatch($tournament_id, '14:20', 1, 'F', 13, 14);
        $this->generateMatch($tournament_id, '14:20', 2, 'BF', 15, 16);
    }
    private function generateTournamentWith16TeamsAtNight($tournament_id, $team_id) {
        $this->generateMatch($tournament_id, '15:00', 1, 'A', $team_id, $team_id + 1);
        $this->generateMatch($tournament_id, '15:00', 2, 'A', $team_id + 2, $team_id + 3);
        $this->generateMatch($tournament_id, '15:20', 1, 'B', $team_id + 4, $team_id + 5);
        $this->generateMatch($tournament_id, '15:20', 2, 'B', $team_id + 6, $team_id + 7);
        $this->generateMatch($tournament_id, '15:40', 1, 'C', $team_id + 8, $team_id + 9);
        $this->generateMatch($tournament_id, '15:40', 2, 'C', $team_id + 10, $team_id + 11);
        $this->generateMatch($tournament_id, '16:00', 1, 'D', $team_id + 12, $team_id + 13);
        $this->generateMatch($tournament_id, '16:00', 2, 'D', $team_id + 14, $team_id + 15);
        $this->generateMatch($tournament_id, '16:20', 1, 'A', $team_id + 1, $team_id + 2);
        $this->generateMatch($tournament_id, '16:20', 2, 'A', $team_id + 3, $team_id);
        $this->generateMatch($tournament_id, '16:40', 1, 'B', $team_id + 1 + 4, $team_id + 2 + 4);
        $this->generateMatch($tournament_id, '16:40', 2, 'B', $team_id + 3 + 4, $team_id + 4);
        $this->generateMatch($tournament_id, '17:00', 1, 'C', $team_id + 1 + 8, $team_id + 2 + 8);
        $this->generateMatch($tournament_id, '17:00', 2, 'C', $team_id + 3 + 8, $team_id + 8);
        $this->generateMatch($tournament_id, '17:20', 1, 'D', $team_id + 1 + 12, $team_id + 2 + 12);
        $this->generateMatch($tournament_id, '17:20', 2, 'D', $team_id + 3 + 12, $team_id + 12);
        $this->generateMatch($tournament_id, '17:40', 1, 'A', $team_id, $team_id + 2);
        $this->generateMatch($tournament_id, '17:40', 2, 'A', $team_id + 3, $team_id + 1);
        $this->generateMatch($tournament_id, '18:00', 1, 'B', $team_id + 4, $team_id + 2 + 4);
        $this->generateMatch($tournament_id, '18:00', 2, 'B', $team_id + 3 + 4, $team_id + 1 + 4);
        $this->generateMatch($tournament_id, '18:20', 1, 'C', $team_id + 8, $team_id + 2 + 8);
        $this->generateMatch($tournament_id, '18:20', 2, 'C', $team_id + 3 + 8, $team_id + 1 + 8);
        $this->generateMatch($tournament_id, '18:40', 1, 'D', $team_id + 12, $team_id + 2 + 12);
        $this->generateMatch($tournament_id, '18:40', 2, 'D', $team_id + 3 + 12, $team_id + 1 + 12);
        $this->generateMatch($tournament_id, '19:00', 1, 'Q1', 1, 6);
        $this->generateMatch($tournament_id, '19:00', 2, 'Q2', 3, 8);
        $this->generateMatch($tournament_id, '19:20', 1, 'Q3', 5, 2);
        $this->generateMatch($tournament_id, '19:20', 2, 'Q4', 7, 4);
        $this->generateMatch($tournament_id, '19:50', 1, 'S1', 9, 10);
        $this->generateMatch($tournament_id, '19:50', 2, 'S2', 11, 12);
        $this->generateMatch($tournament_id, '20:20', 1, 'F', 13, 14);
        $this->generateMatch($tournament_id, '20:20', 2, 'BF', 15, 16);
    }
    private function generateTournamentWith8Teams($tournament_id, $team_id, $start_hour) {
        $second_hour = $start_hour + 1;
        $third_hour = $start_hour + 2;

        $this->generateMatch($tournament_id, "{$start_hour}:00", 1, 'A', $team_id, $team_id + 1);
        $this->generateMatch($tournament_id, "{$start_hour}:00", 2, 'A', $team_id + 2, $team_id + 3);
        $this->generateMatch($tournament_id, "{$start_hour}:20", 1, 'B', $team_id + 4, $team_id + 5);
        $this->generateMatch($tournament_id, "{$start_hour}:20", 2, 'B', $team_id + 6, $team_id + 7);
        $this->generateMatch($tournament_id, "{$start_hour}:40", 1, 'A', $team_id + 1, $team_id + 2);
        $this->generateMatch($tournament_id, "{$start_hour}:40", 2, 'A', $team_id + 3, $team_id);
        $this->generateMatch($tournament_id, "{$second_hour}:00", 1, 'B', $team_id + 1 + 4, $team_id + 2 + 4);
        $this->generateMatch($tournament_id, "{$second_hour}:00", 2, 'B', $team_id + 3 + 4, $team_id + 4);
        $this->generateMatch($tournament_id, "{$second_hour}:20", 1, 'A', $team_id, $team_id + 2);
        $this->generateMatch($tournament_id, "{$second_hour}:20", 2, 'A', $team_id + 3, $team_id + 1);
        $this->generateMatch($tournament_id, "{$second_hour}:40", 1, 'B', $team_id + 4, $team_id + 2 + 4);
        $this->generateMatch($tournament_id, "{$second_hour}:40", 2, 'B', $team_id + 3 + 4, $team_id + 1 + 4);
        $this->generateMatch($tournament_id, "{$third_hour}:10", 1, 'S1', 1, 4);
        $this->generateMatch($tournament_id, "{$third_hour}:10", 2, 'S2', 3, 2);
        $this->generateMatch($tournament_id, "{$third_hour}:40", 1, 'F', 13, 14);
        $this->generateMatch($tournament_id, "{$third_hour}:40", 2, 'BF', 15, 16);
    }
    private function generateMatch($tournament_id, $kickoff_at, $field, $match_code, $hometeam_id, $awayteam_id) {
        Match::create(array(
            'tournament_id' => $tournament_id,
            'kickoff_at'    => $kickoff_at,
            'field'         => $field,
            'match_code'    => $match_code,
            'hometeam_id'   => $hometeam_id,
            'awayteam_id'   => $awayteam_id,
            'score_home'    => null,
            'score_away'    => null
        ));
    }
}
class GoalsTableSeeder extends Seeder {
    public function run() {
        DB::table('goals')->delete();
        $faker = Faker::create();
        foreach (range(1, 100) as $index) {
            Goal::create(array(
                'match_id'      => $faker->numberBetween(1, 20),
                'player_id'     => $faker->numberBetween(1, 100)
            ));
        }
    }
}
