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

				//$this->call('PlayersTableSeeder');
				//$this->command->info('Player table seeded!');

				$this->call('MatchesTableSeeder');
				$this->command->info('Match table seeded!');

				//$this->call('GoalsTableSeeder');
				//$this->command->info('Goal table seeded!');

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


        /*$faker = Faker::create();

        foreach (range(1, 47) as $index) {
            User::create(array(
                'email' => $faker->email(),
                'password' => Hash::make($faker->word(10)),
                'teacher' => false
            ));
        }*/

    }
}

class TournamentTableSeeder extends Seeder {

    public function run()
    {
        DB::table('tournaments')->delete();

        Tournament::create(array(
            'name' => 'Vanvikan Indoor J13',
            'date' => '2024-03-03',
            'location' => 'Vanvikanhallen'
        ));

        Tournament::create(array(
          'name' => 'Vanvikan Indoor J15',
          'date' => '2024-03-02',
          'location' => 'Vanvikanhallen'
        ));

        Tournament::create(array(
          'name' => 'Vanvikan Indoor J17',
          'date' => '2024-03-02',
          'location' => 'Vanvikanhallen'
        ));

    }
}

class TeamsTableSeeder extends Seeder {

    public function run()
    {
        DB::table('teams')->delete();

        // Team::create(array('name' => 'Charlottenlund SK 1', 'group_code' => 'A'));
        // Team::create(array('name' => 'Astor FK 3', 'group_code' => 'A'));
        // Team::create(array('name' => 'Stadsbygd/Vanvik/Rissa 1', 'group_code' => 'A'));
        // Team::create(array('name' => 'Stjørna/HIL/Fevåg 1', 'group_code' => 'A'));

        // Team::create(array('name' => 'Charlottenlund SK 2', 'group_code' => 'B'));
        // Team::create(array('name' => 'Astor FK 1', 'group_code' => 'B'));
        // Team::create(array('name' => 'Skaun/Buvik 2', 'group_code' => 'B'));
        // Team::create(array('name' => 'Stjørna/HIL/Fevåg 2', 'group_code' => 'B'));

        // Team::create(array('name' => 'Charlottenlund SK 3', 'group_code' => 'C'));
        // Team::create(array('name' => 'Astor FK 2', 'group_code' => 'C'));
        // Team::create(array('name' => 'Skaun/Buvik 1', 'group_code' => 'C'));
        // Team::create(array('name' => 'Stadsbygd/Vanvik/Rissa 2', 'group_code' => 'C'));

        // Team::create(array('name' => 'Vinner A')); 
        // Team::create(array('name' => 'Vinner B'));
        // Team::create(array('name' => 'Vinner C')); 
        // Team::create(array('name' => 'Beste 2. plass')); 




        // Team::create(array('name' => 'Vinner SF1'));
        // Team::create(array('name' => 'Vinner SF2'));

        // Team::create(array('name' => 'Taper SF1')); 
        // Team::create(array('name' => 'Taper SF2')); 

        // Team::create(array('name' => 'Rissa/Stadsbygd/Vanvik 3', 'group_code' => 'A'));
        // Team::create(array('name' => 'Stjørna/HIL/Fevåg 1', 'group_code' => 'A'));
        // Team::create(array('name' => 'Rissa/Stadsbygd/Vanvik 2', 'group_code' => 'A'));
        // Team::create(array('name' => 'Freidig 2', 'group_code' => 'A'));
        // Team::create(array('name' => 'Byåsen IL', 'group_code' => 'A'));

        // Team::create(array('name' => 'Rissa/Stadsbygd/Vanvik 1', 'group_code' => 'B'));
        // Team::create(array('name' => 'FK Fosen', 'group_code' => 'B'));
        // Team::create(array('name' => 'Freidig 1', 'group_code' => 'B'));
        // Team::create(array('name' => 'Stjørna/HIL/Fevåg 2', 'group_code' => 'B'));
        // Team::create(array('name' => 'Heimdal Fotball', 'group_code' => 'B'));


        // Team::create(array('name' => '2. plass gruppe A')); 
        // Team::create(array('name' => '2. plass gruppe B')); 


        Team::create(array('name' => 'Rissa/Stadsbygd/Vanvik 1', 'group_code' => 'A'));
        Team::create(array('name' => 'Leksvik 1', 'group_code' => 'A'));
        Team::create(array('name' => 'FK Fosen 2', 'group_code' => 'A'));
        Team::create(array('name' => 'Ørland BK 2', 'group_code' => 'A'));
        
        Team::create(array('name' => 'FK Fosen 1', 'group_code' => 'B'));
        Team::create(array('name' => 'Leksvik 2', 'group_code' => 'B'));
        Team::create(array('name' => 'Rissa/Stadsbygd/Vanvik 2', 'group_code' => 'B'));
        Team::create(array('name' => 'Ørland BK 1', 'group_code' => 'B'));

        Team::create(array('name' => 'Vinner A')); 
        Team::create(array('name' => 'Vinner B'));

        Team::create(array('name' => '2. plass gruppe A')); 
        Team::create(array('name' => '2. plass gruppe B')); 


        Team::create(array('name' => 'Utleira 3', 'group_code' => 'A'));
        Team::create(array('name' => 'Selbu BK 1', 'group_code' => 'A'));
        Team::create(array('name' => 'Sokna IL 1', 'group_code' => 'A'));
        Team::create(array('name' => 'Skaun BK 3', 'group_code' => 'A'));
        
        Team::create(array('name' => 'Sokna IL 2', 'group_code' => 'B'));
        Team::create(array('name' => 'Skaun BK 1', 'group_code' => 'B'));
        Team::create(array('name' => 'Leksvik IL 2', 'group_code' => 'B'));
        Team::create(array('name' => 'Utleira 1', 'group_code' => 'B'));

        Team::create(array('name' => 'Skaun BK 2', 'group_code' => 'C'));
        Team::create(array('name' => 'Utleira 2', 'group_code' => 'C'));
        Team::create(array('name' => 'Leksvik IL 1', 'group_code' => 'C'));
        Team::create(array('name' => 'Selbu BK 2', 'group_code' => 'C'));

        Team::create(array('name' => 'Vinner C')); 
        Team::create(array('name' => 'Beste 2. plass')); 

        Team::create(array('name' => 'Vinner SF1'));
        Team::create(array('name' => 'Vinner SF2'));

        Team::create(array('name' => 'Taper SF1')); 
        Team::create(array('name' => 'Taper SF2')); 


        Team::create(array('name' => 'Il Varden Meråker 2', 'group_code' => 'A'));
        Team::create(array('name' => 'Ranheim IL 1', 'group_code' => 'A'));
        Team::create(array('name' => 'Flatås', 'group_code' => 'A'));
        Team::create(array('name' => 'Tiller IL 2', 'group_code' => 'A'));
        
        Team::create(array('name' => 'Tiller IL 1', 'group_code' => 'B'));
        Team::create(array('name' => 'Ørland BK', 'group_code' => 'B'));
        Team::create(array('name' => 'Il Varden Meråker 1', 'group_code' => 'B'));
        Team::create(array('name' => 'National 2', 'group_code' => 'B'));

        Team::create(array('name' => 'Leksvik IL', 'group_code' => 'C'));
        Team::create(array('name' => 'Ranheim IL 2', 'group_code' => 'C'));
        Team::create(array('name' => 'National 1', 'group_code' => 'C'));
        Team::create(array('name' => 'Sjetne IL', 'group_code' => 'C'));
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
                'team_id' => $faker->numberBetween(1, 25)
            ));
        }

    }
}

class MatchesTableSeeder extends Seeder {

    public function run() {


        DB::table('matches')->delete();

				// $this->generateMatch(1, '09:00', 1, 'A', 1, 2);
				// $this->generateMatch(1, '09:00', 2, 'A', 3, 4);

        // $this->generateMatch(1, '09:20', 1, 'B', 5, 6);
				// $this->generateMatch(1, '09:20', 2, 'B', 7, 8);

        // $this->generateMatch(1, '09:40', 1, 'C', 9, 10);
				// $this->generateMatch(1, '09:40', 2, 'C', 11, 12);


        // $this->generateMatch(1, '10:00', 1, 'A', 2, 3);
				// $this->generateMatch(1, '10:00', 2, 'A', 4, 1);

        // $this->generateMatch(1, '10:20', 1, 'B', 6, 7);
				// $this->generateMatch(1, '10:20', 2, 'B', 8, 5);

        // $this->generateMatch(1, '10:40', 1, 'C', 10, 11);
				// $this->generateMatch(1, '10:40', 2, 'C', 12, 9);

        
        // $this->generateMatch(1, '11:00', 1, 'A', 1, 3);
				// $this->generateMatch(1, '11:00', 2, 'A', 4, 2);

        // $this->generateMatch(1, '11:20', 1, 'B', 5, 7);
				// $this->generateMatch(1, '11:20', 2, 'B', 8, 6);

        // $this->generateMatch(1, '11:40', 1, 'C', 9, 11);
				// $this->generateMatch(1, '11:40', 2, 'C', 12, 10);


        // $this->generateMatch(1, '12:10', 1, 'S1', 13, 14);
				// $this->generateMatch(1, '12:10', 2, 'S2', 15, 16);


        // $this->generateMatch(1, '12:40', 1, 'F', 17, 18);
				// $this->generateMatch(1, '12:40', 2, 'BF', 19, 20);

        // -------------------------------------------------------- G16

        // $this->generateMatch(2, '13:10', 1, 'A', 21, 22);
				// $this->generateMatch(2, '13:10', 2, 'B', 26, 27);

        // $this->generateMatch(2, '13:30', 1, 'A', 23, 24);
				// $this->generateMatch(2, '13:30', 2, 'B', 28, 29);

        // $this->generateMatch(2, '13:50', 1, 'A', 25, 21);
				// $this->generateMatch(2, '13:50', 2, 'B', 30, 26);

        // $this->generateMatch(2, '14:10', 1, 'A', 22, 23);
				// $this->generateMatch(2, '14:10', 2, 'B', 27, 28);

        // $this->generateMatch(2, '14:30', 1, 'A', 24, 25);
				// $this->generateMatch(2, '14:30', 2, 'B', 29, 30);

        // $this->generateMatch(2, '14:50', 1, 'A', 21, 23);
				// $this->generateMatch(2, '14:50', 2, 'B', 26, 28);

        // $this->generateMatch(2, '15:10', 1, 'A', 22, 24);
				// $this->generateMatch(2, '15:10', 2, 'B', 27, 29);

        // $this->generateMatch(2, '15:30', 1, 'A', 23, 25);
				// $this->generateMatch(2, '15:30', 2, 'B', 28, 30);

        // $this->generateMatch(2, '15:50', 1, 'A', 24, 21);
				// $this->generateMatch(2, '15:50', 2, 'B', 29, 26);

        // $this->generateMatch(2, '16:10', 1, 'A', 25, 22);
				// $this->generateMatch(2, '16:10', 2, 'B', 30, 27);

        // $this->generateMatch(2, '16:40', 1, 'F', 13, 14);
				// $this->generateMatch(2, '16:40', 2, 'BF', 31, 32);

        // -------------------------------------------------------- J13
        
        $this->generateMatch(1, '09:00', 1, 'A', 1, 2);
				$this->generateMatch(1, '09:00', 2, 'A', 3, 4);
        
        $this->generateMatch(1, '09:20', 1, 'B', 5, 6);
				$this->generateMatch(1, '09:20', 2, 'B', 7, 8);
        
        $this->generateMatch(1, '09:40', 1, 'A', 2, 3);
				$this->generateMatch(1, '09:40', 2, 'A', 4, 1);
        
        $this->generateMatch(1, '10:00', 1, 'B', 6, 7);
				$this->generateMatch(1, '10:00', 2, 'B', 8, 5);
        
        $this->generateMatch(1, '10:20', 1, 'A', 1, 3);
				$this->generateMatch(1, '10:20', 2, 'A', 4, 2);
        
        $this->generateMatch(1, '10:40', 1, 'B', 5, 7);
				$this->generateMatch(1, '10:40', 2, 'B', 8, 6);
        
        $this->generateMatch(1, '11:10', 1, 'F', 9, 10);
				$this->generateMatch(1, '11:10', 2, 'BF', 11, 12);
        
        // -------------------------------------------------------- J15

        $this->generateMatch(2, '11:40', 1, 'A', 13, 14);
				$this->generateMatch(2, '11:40', 2, 'A', 15, 16);

        $this->generateMatch(2, '12:00', 1, 'B', 17, 18);
				$this->generateMatch(2, '12:00', 2, 'B', 19, 20);

        $this->generateMatch(2, '12:20', 1, 'C', 21, 22);
				$this->generateMatch(2, '12:20', 2, 'C', 23, 24);


        $this->generateMatch(2, '12:40', 1, 'A', 14, 15);
				$this->generateMatch(2, '12:40', 2, 'A', 16, 13);

        $this->generateMatch(2, '13:00', 1, 'B', 18, 19);
				$this->generateMatch(2, '13:00', 2, 'B', 20, 17);

        $this->generateMatch(2, '13:20', 1, 'C', 22, 23);
				$this->generateMatch(2, '13:20', 2, 'C', 24, 21);

        
        $this->generateMatch(2, '13:40', 1, 'A', 13, 15);
				$this->generateMatch(2, '13:40', 2, 'A', 16, 14);

        $this->generateMatch(2, '14:00', 1, 'B', 17, 19);
				$this->generateMatch(2, '14:00', 2, 'B', 20, 18);

        $this->generateMatch(2, '14:20', 1, 'C', 21, 23);
				$this->generateMatch(2, '14:20', 2, 'C', 24, 22);


        $this->generateMatch(2, '14:50', 1, 'S1', 9, 10);
				$this->generateMatch(2, '14:50', 2, 'S2', 25, 26);


        $this->generateMatch(2, '15:20', 1, 'F', 27, 28);
				$this->generateMatch(2, '15:20', 2, 'BF', 29, 30);

        // -------------------------------------------------------- J19

        $this->generateMatch(3, '15:50', 1, 'A', 31, 32);
				$this->generateMatch(3, '15:50', 2, 'A', 33, 34);

        $this->generateMatch(3, '16:10', 1, 'B', 35, 36);
				$this->generateMatch(3, '16:10', 2, 'B', 37, 38);

        $this->generateMatch(3, '16:30', 1, 'C', 39, 40);
				$this->generateMatch(3, '16:30', 2, 'C', 41, 42);


        $this->generateMatch(3, '16:50', 1, 'A', 32, 33);
				$this->generateMatch(3, '16:50', 2, 'A', 34, 31);

        $this->generateMatch(3, '17:10', 1, 'B', 36, 37);
				$this->generateMatch(3, '17:10', 2, 'B', 38, 35);

        $this->generateMatch(3, '17:30', 1, 'C', 40, 41);
				$this->generateMatch(3, '17:30', 2, 'C', 42, 39);

        
        $this->generateMatch(3, '17:50', 1, 'A', 31, 33);
				$this->generateMatch(3, '17:50', 2, 'A', 34, 32);

        $this->generateMatch(3, '18:10', 1, 'B', 35, 37);
				$this->generateMatch(3, '18:10', 2, 'B', 38, 36);

        $this->generateMatch(3, '18:30', 1, 'C', 39, 41);
				$this->generateMatch(3, '18:30', 2, 'C', 42, 40);


        $this->generateMatch(3, '19:00', 1, 'S1', 9, 10);
				$this->generateMatch(3, '19:00', 2, 'S2', 25, 26);


        $this->generateMatch(3, '19:30', 1, 'F', 27, 28);
				$this->generateMatch(3, '19:30', 2, 'BF', 29, 30);
    }

    private function generateMatch($tournament_id, $kickoff_at, $field, $match_code, $hometeam_id, $awayteam_id) {
        $faker = Faker::create();

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
                'match_id'      => $faker->numberBetween(1, 25),
                'player_id'     => $faker->numberBetween(1, 100)
            ));
        }
    }
}
