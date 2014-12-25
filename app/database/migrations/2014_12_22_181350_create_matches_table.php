<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;

class CreateMatchesTable extends Migration {

	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::create('matches', function(Blueprint $table)
		{
			$table->increments('id');
			$table->integer('tournament_id')->unsigned()->index()->nullable();
			$table->foreign('tournament_id')->references('id')->on('tournaments')->onDelete('set null');
			$table->time('kickoff_at')->nullable();
			$table->enum('field', array('1', '2'));
			$table->enum('match_code', array('A', 'B', 'C', 'D', 'W', 'Q1', 'Q2', 'Q3', 'Q4', 'S1', 'S2', 'F'));
			$table->integer('hometeam_id')->unsigned()->index()->nullable();
			$table->foreign('hometeam_id')->references('id')->on('teams')->onDelete('set null');
			$table->integer('awayteam_id')->unsigned()->index()->nullable();
			$table->foreign('awayteam_id')->references('id')->on('teams')->onDelete('set null');
			$table->integer('score_home')->unsigned()->nullable();
			$table->integer('score_away')->unsigned()->nullable();
			$table->timestamps();
		});
	}


	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::drop('matches');
	}

}
